var config = require("./config"),
  coax = require("coax");



function refreshSync(rep, cb) {
  var cancel = JSON.parse(JSON.stringify(rep));
  cancel.cancel = true;
  coax.post([config.dbHost, "_replicate"], cancel, function() {
    coax.post([config.dbHost, "_replicate"], rep, cb)
  })
}
function refreshPush() {
  refreshSync(pushRep, function(err, ok) {
    console.log("pushRep", err, ok)
  })
}


var pullRep = {
    source : config.syncTarget,
    target : config.dbName,
    continuous : true
  },
  pushRep = {
    target : config.syncTarget,
    source : config.dbName,
    continuous : true
  };

// takes care of triggering pull and push replication to the cloud.
// also handles getting a browserid assertion if there is an authentication error.
// is a sync is running it will cancel it and retrigger transparently.
exports.trigger = function(cb) {
  console.log("triggering sync");
  refreshSync(pullRep, function(err, ok) {
    console.log("pullRep", err, ok)
    // cb()
  });
};
