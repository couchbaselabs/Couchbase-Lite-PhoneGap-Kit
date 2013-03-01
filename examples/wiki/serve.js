var http = require('http');
var send = require('send');
var url = require('url');
var coux = require('coux');
var fs = require('fs');
var browserify = require('browserify');

var baseCouch = "http://localhost:4984";
var baseCouchAuth = "http://localhost:4985";
var CouchbaseViews = "http://localhost:8092"

var push = require("./push");
push.go();

var b = browserify({watch : true, debug : true});
b.addEntry("./www/js/app.js");
b.on('bundle', function() {
  var src = b.bundle();
  if (!b.ok) {
    throw("bundle error")
  }
  fs.writeFile("./www/js/output.js", src, function () {
    console.log(Buffer(src).length + ' bytes written to output.js');
  });
})
b.emit("bundle");

coux.put("http://localhost:4985/GUEST", {
  name: "GUEST", password : "GUEST",
  channels : []
}, function(err, ok) {
  if (err) {
    console.log("couldn't turn off GUEST access", err);
    process.exit(-1);
  }
});

function handleChannelsRequest(req, res) {

  // todo trigger this from changes
  function handleChannelBody(body) {
    var data = JSON.parse(body.toString()),
        baseCouchUserId = data.user,
        baseCouchData = {
          name : data.user,
          password : data.pass
        };
      // find channels with this user id:
      coux([CouchbaseViews+"/basecouch/_design/wiki/_view/by_members",
          {stale:false,group:true,connection_timeout:60000,
            start_key : [data.user], end_key : [data.user, {}]}],
        function(err, view) {
          if (err && err.reason == "not_found") {
            return console.error(err);
            } else if (err) {
            return console.error(err);
          };

          var channelIds = view.rows.map(function(r) {return r.key[1]});
          res.statusCode = 200;
          console.log("channels"+channelIds);
          baseCouchData.channels = channelIds;
          coux([baseCouchAuth,data.user], function(err, existingUserDoc) {
            console.log("get", err, existingUserDoc)
            if (err && existingUserDoc.statusCode == 404) {
              // we can create a new user with this password
              coux.put([baseCouchAuth,data.user], baseCouchData, function(err, ok) {
                console.log("put new user", err, baseCouchData, ok);
                res.end(JSON.stringify(baseCouchData.channels));
              });
            } else if (!err) {
              // todo we should validate the password
              existingUserDoc.channels = baseCouchData.channels;
/////////// here we need to update the existingUserDoc?

              // update the existing user with the new channels
              coux.put([baseCouchAuth,data.user], existingUserDoc, function(err, ok) {
                console.log("put existing user", err, existingUserDoc, ok);
                res.end(JSON.stringify(existingUserDoc.channels));
              });
            }
          });
        });
  }


  if (req.method != "POST") {
    res.statusCode = 406;
    res.end("POST required")
  }

  var chunk = "";
  req.on('data', function(data) {
    console.log("Received body data:");
    console.log(chunk += data.toString());
  });

  req.on('end', function() {
    // empty 200 OK response for now
    if (chunk) {
      console.log("body",chunk)
      handleChannelBody(chunk)
    } else {
      console.log("empty body");
    }
  });

}

var app = http.createServer(function(req, res){
  // your custom error-handling logic:
  function error(err) {
    res.statusCode = err.status || 500;
    res.end(err.message);
  }
  var test
  var path = url.parse(req.url).pathname;
  console.log("GET", path)
  if (/^\/(wiki|_replicate)/.test(path)) {
    var proxy = http.createClient(5984, 'localhost')
    var proxyRequest = proxy.request(req.method, req.url, req.headers);
    proxyRequest.on('response', function (proxyResponse) {
      proxyResponse.pipe(res);
    });
    req.pipe(proxyRequest);
  } else if (/^\/channels/.test(path)) {
    handleChannelsRequest(req, res);
  } else {
    res.setHeader("Access-Control-Allow-Origin","*");
    send(req, url.parse(req.url).pathname)
      .root(__dirname+'/www')
      .on('error', error)
      .pipe(res);
  }
}).listen(3000);
