var config = require("./config"),
  coax = require("coax");


var pullRep, pushRep,
  pullPath = [config.dbHost, "_replicator", "channel_pull-"+config.dbName],
  pushPath = [config.dbHost, "_replicator", "channel_push-"+config.dbName];

function refreshSyncDoc(path, rep, cb) {
  coax.get(path, function(err, ok) {
    if (err) {
      console.log("newdoc", err, path);
      // make a new doc
      coax.put(path, rep, cb);
    } else {
      // delete it and make a new doc
      var revpath = path.concat({rev:ok._rev})
      console.log("deleting revpath", revpath, rep);
      coax.del(revpath, function(err, ok) {
        if (err) {
          console.log("couldn't delete", err, revpath)
        }
        coax.put(path, rep, cb);
      })
    }
  });
}
function refreshSyncOnce(path, rep, cb) {
  var cancel = JSON.parse(JSON.stringify(rep));
  cancel.cancel = true;
  coax.post([config.dbHost, "_replicate"], cancel, function() {
    coax.post([config.dbHost, "_replicate"], rep, cb)
  })
}
function refreshPush() {
  var doSync = false ? refreshSyncDoc : refreshSyncOnce;
  doSync(pushPath, pushRep, function(err, ok) {
    console.log("pushRep", err, ok)
  })
}
function refreshPull() {
  var doSync = false ? refreshSyncDoc : refreshSyncOnce;
  doSync(pullPath, pullRep, function(err, ok) {
    console.log("pullRep", err, ok)
  })
}

function syncForUser(user, cb) {
  coax.post(config.channelServer+'?r='+Math.random(), user, function(err) {
      if (cb) {cb(err);}
      pullRep = {
        source : "http://"+user.user+":"+user.pass+"@"+config.syncTarget,
        target : config.dbName,
        continuous : true,
        filter : "sync_gateway/bychannel",
        query_params : {
            channels : '*'
        }
      };
      pushRep = {
          target : "http://"+user.user+":"+user.pass+"@"+config.syncTarget,
          source : config.dbName,
          continuous : true
      };
      refreshPush();
      refreshPull();
  });
};

exports.trigger = function(userDoc, cb) {
  syncForUser(userDoc, cb);
  return function(){
    syncForUser(userDoc, cb);
  }
};
