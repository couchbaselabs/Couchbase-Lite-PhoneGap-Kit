var SYNC_HOSTNAME=process.env.SYNC_HOSTNAME,
  dbName = "mydb",
  bucketDesignUrl = "http://"+SYNC_HOSTNAME+":8091/couchBase/sync_gateway/_design/threads",
  bucketWikiMembersView = "http://"+SYNC_HOSTNAME+":8092/sync_gateway/_design/threads/_view/by_members",
  baseCouchAuth = "http://"+SYNC_HOSTNAME+":4985",
  channelPass = Math.random().toString(20).slice(2),
  baseDbUrl = "http://channelServer:"+channelPass+"@"+SYNC_HOSTNAME+":4984/sync_gateway",
  designUrl = "http://channelServer:"+channelPass+"@"+SYNC_HOSTNAME+":4984/sync_gateway/_design/channels";

if (!SYNC_HOSTNAME) {
  console.log(("launch like: SYNC_HOSTNAME=myhost.local node serve.js"));
  process.exit(-1);
}

var fs = require("fs"),
  coax = require("coax"),
  http = require("http"),
  url = require("url"),
  async = require("async");

var b = require("browserify")({watch : true, debug : true});
b.addEntry(__dirname + "/../www/js/app.js");
b.on('bundle', function() {
  var src = b.bundle();
  if (!b.ok) {
    throw("bundle error")
  }
  fs.writeFile(__dirname + "/../www/js/output.js", src, function () {
    console.log(Buffer(src).length + ' bytes written to output.js');
  });
})
b.emit("bundle");


function revokeGuestAccess(cb) {
  // turn off guest access
  coax.put(baseCouchAuth+"/GUEST", {
    disabled : true,
    channels : []
  }, function(err, ok) {
    if (err) {
      console.log("couldn't turn off GUEST access", err);
      process.exit(-1);
    }
    cb();
  });
}

function installDDoc(url, doc, cb) {
  console.log("installing "+url)
  coax(url, function(err, old) {
    if (err && err.error !== "not_found") {
      return cb(err)
    }
    if (!err) {
      doc._rev = old._rev;
    }
    coax.put(url, doc, cb);
  });
}

function channelMap(doc) {
  var ch = doc.thread_id;
  if (ch) {
    sync("ch-"+ch);
  }
  if (doc.members && doc.owner_id) {
    sync("threads");
    sync("threads-"+doc.owner_id);
    ms = doc.members.split(" ");
    for (i = ms.length - 1; i >= 0; i--) {
      if (ms[i]) {
        sync("threads-"+ms[i]);
      }
    }
  }
}




var ByMembersBucketView = function (doc, meta) {
  var i, ms, ch = doc.thread_id;
  if (ch && doc.members) {
    ms = doc.members.split(" ");
    for (i = ms.length - 1; i >= 0; i--) {
      if (ms[i]) emit([ms[i], ch], doc.title);
    }
    if (doc.owner_id) {emit([doc.owner_id, ch], doc.title);}
  }
}



var since = 0;
function watchForThreads(url, cb) {
  coax(url+'&since='+since, function(err, ok){
    if (err) {
      throw("watchForThreads: "+JSON.stringify(err))
    } else {
      since = ok.last_seq;
      async.map(ok.results, function(r, next){
        coax([baseDbUrl, r.id], next);
      }, function(changes) {
        cb(changes);
        watchForThreads(url, cb);
      });
    }
  });
}

function setChannelsForUser(user, channels, cb){
  coax([baseCouchAuth, user], function(err, doc) {
    if (err || doc.statusCode == 404) {
      console.log("missing user", user);
      return cb();
    } else {
      // console.log("doc", doc)
      channels.push("threads-"+user);
      doc.channels = channels;
      console.log("put channels", user, channels);
      coax.put([baseCouchAuth, user], doc, cb);
    }
  })
};

function updateUsers(users) {
  async.forEach(users, function(user, cb){
    coax([bucketWikiMembersView,
        {stale:false,group:true,connection_timeout:60000,
          start_key : [user], end_key : [user, {}]}], function(err, view){
            if (err) return cb(err);
            var channels = view.rows.map(function(r){return "ch-"+r.key[1]});
            setChannelsForUser(user, channels, cb);
          });
  }, function(err, done) {
    if (err) {
      throw(err)
    } else {
      console.log("users updated");
    }
  });
}

function listenForNewChannels() {
  coax(baseDbUrl).changes({
    filter:"sync_gateway/bychannel",
    include_docs : true,
    channels : "*"
  }, function(err, change) {
    if (err) {
      console.log('changes err', baseDbUrl)
      throw(JSON.stringify(err))
    } else {
      var doc = change.doc;
      if (doc && doc.members && doc.owner_id) {
        updateUsers(doc.members.split(' ').concat(doc.owner_id));
      }
    }
  });
}

function pushSyncDDoc(cb) {
  // install sync function
  installDDoc(designUrl, {
      _id : "_design/channels",
      channelmap : channelMap.toString()
    }, function(err, ok){
      if (err) {
        throw("couldn't push sync ddoc: "+JSON.stringify(err));
      } else {
        console.log("pushed sync ddoc");
        cb();
      }
    });
}


function pushBucketDDoc(cb) {
  installDDoc(bucketDesignUrl, {
      _id : "_design/threads",
      views : {
        "by_members" : {reduce : "_count", map : ByMembersBucketView.toString()}
      }
    }, function(err, ok){
      if (err) {
        throw("couldn't push bucket ddoc " + JSON.stringify(err));
      } else {
        console.log("pushed bucket ddoc");
        cb()
      }
    });
}

function setupChannelServerAuth(cb) {
  coax.put(baseCouchAuth+"/channelServer", {
    name: "channelServer", password : channelPass,
    channels : ["*"]
  }, function(err, ok) {
    if (err) {
      console.log("couldn't turn on channelServer access", err);
      process.exit(-1);
    } else {
      cb();
    }
  });
}

function doSetup(done) {
  // install bucket design docs
  revokeGuestAccess(function(){
    setupChannelServerAuth(function(){
      pushBucketDDoc(function(){
        pushSyncDDoc(function(){
          done();
        });
      });
    })
  });
}


// serve http for user signup
// get credentials request, set credentials if they aren't set yet

function handleSignup (req, res) {
  function handleSignupBody(body) {
    var data = JSON.parse(body); // {user : "name", pass : "s3cr3t"}
    coax([baseCouchAuth, data.user], function(err, doc) {
      console.log("get user", data.user, err, doc)
      if (doc.statusCode == 404) {
        console.log("new user", data);
        coax.put([baseCouchAuth, data.user], {
          name : data.user,
          password : data.pass,
          channels : ["threads-"+data.user] // initially only sync thread descriptors
        }, function(err, ok) {
          if (err) {
            console.log("new user put err",err);
            res.statusCode = 500;
            res.end(JSON.stringify({error:"new user err"}))
          } else {
            console.log("new user put",data.user, ok);
            res.statusCode = 200;
            res.end(JSON.stringify({ok:"new user"}));
          }

        });
      } else {
        res.statusCode = 401;
        res.end(JSON.stringify({error:"exists", reason: "can't set credentials for existing user"}));
      }
    })
  }

  if (req.method != "POST") {
    res.statusCode = 406;
    res.end(JSON.stringify({error:"POST required"}))
  }

  var chunk = "";
  req.on('data', function(data) {
    chunk += data.toString();
  });

  req.on('end', function() {
    // empty 200 OK response for now
    if (chunk) {
      handleSignupBody(chunk)
    }
  });
}

function startServer() {
  http.createServer(function(req, res){
    var path = url.parse(req.url).pathname;
    console.log(req.method, path);
    if (/^\/signup/.test(path)) {
      handleSignup(req, res);
    }
  }).listen(3000);
}



doSetup(function(){
  listenForNewChannels();
  startServer();
});


