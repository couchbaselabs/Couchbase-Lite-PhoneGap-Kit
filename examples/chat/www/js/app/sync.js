var config = require("./config"),
  coax = require("coax");



function refreshSync(rep, cb) {
  var cancel = JSON.parse(JSON.stringify(rep));
  cancel.cancel = true;
  coax.post([config.dbHost, "_replicate"], cancel, function(err) {
    if (err) {
      console.log("nothing to cancel")
    }
    coax.post([config.dbHost, "_replicate"], rep, cb)
  })
}

var pullRep = {
    source : {url : config.syncTarget},
    target : config.dbName
    // , continuous : true
  },
  pushRep = {
    target : {url: config.syncTarget},
    source : config.dbName
    // , continuous : true
  };

// takes care of triggering pull and push replication to the cloud.
// also handles getting a browserid assertion if there is an authentication error.
// is a sync is running it will cancel it and retrigger transparently.
function triggerSync(cb, retries) {
  if (retries === 0) cb("too many retries");
  retries = retries || 3;
  console.log(["triggering sync", pullRep]);
  refreshSync(pushRep, function(err, ok) {
    console.log(["pushRep", err, ok])
    // should use some setInterval with repeater until success or timeout...
    // or a sync replication API

    setTimeout(function(){
      config.dbServer.get("_active_tasks", function(err, tasks){
        var info = tasks[0];
        console.log(["_active_tasks", info.error]);
        if (info.error && info.error[0] == 401) {
          window.presentBrowserIdDialog(config.syncOrigin, function(err, assertion){
            if (err) throw (err);
            // we are logged in!
            // todo we should make sure the email address is the same as our content belongs to
            var postbody = {assertion:assertion};
            config.dbServer.post("_browserid_assertion", postbody, function(err, info) {
              if (err) throw(err);
              if (info.email) {
                config.db.forceSave({_id : "_local/user", email:info.email}, function(err, ok) {
                  // if (err) throw(err);
                  pullRep.source.auth = {browserid:{email:info.email}};
                  pushRep.target.auth = {browserid:{email:info.email}};
                  console.log(["retry with email", info.email]);
                  triggerSync(cb, retries-1);
                })
              }
            });
          });
        // if 403 we don't have any channels yet...
        } else {
          // we are replicating, we must have a session
          refreshSync(pullRep, function(err, ok) {
            config.db("_local/user", cb);
          });

        }
      });
    },500)
  });
};

exports.trigger = triggerSync;
