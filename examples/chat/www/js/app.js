$(function() {
  var config = require('./app/config'),
    home = require("./app/home"),
    thread = require("./app/thread"),
    sync = require('./app/sync'),
    // libraries
    coax = require("coax"),
    touchlink = require("./touchlink"),
    fastclick = require("fastclick"),
    router = require("./routes-element");
    // router = require('director').Router;

  new fastclick.FastClick(document.body);

  var content = $("#content")[0],
    contentRoutes = {
      // "/reload" : home.reload,
      // "/reloaded" : home.reloaded,
      "/" : home.index,
      // "/ready" : home.ready,
      "/threads/new" : thread.create,
      "/thread/:id" : thread.view
    };

  var changesSetup = false;
  function setupChanges(changesHandler) {
    if (changesSetup) return;
    changesSetup = true;
    config.db(function(err, info){
      console.log("setup changes",info);
      config.db.changes({include_docs:true, since:info.update_seq}, function(err, change){
        if (err) {
          console.log(["changes doc err", err]);
        } else {
          // console.log(["chn", change])
          change.doc && changesHandler(change.doc);
        }
      });
    });

  }
  // start the sync
  function appInit(cb) {
    sync.trigger(function(err, user){
      if (err) {
        console.log(["login err", err]);
        return;
      }
      if (user && user.email) {
        console.log("we are "+user.email);
        config.email = user.email;
        config.db.put("profile:"+user.email, {type : "profile"}, function() {
          cb(false, user.email);
        });
      }
    });
  }

  config.setup(function(err, ok){
    if (err) {
      return console.log(err);
    }
    appInit(function(err, email) {
      var contentRouter = router(contentRoutes, content);
      contentRouter.init();

      // setupChanges(function(doc){
      //   // console.log(["change",location.hash, doc]);
      //   var currentThread = location.hash.split('/').pop();
      //   if (doc.type == "message" && doc.thread_id == currentThread) {
      //     // redraw the chat
      //     // console.log("chat redraw", currentThread)
      //     contentRouter.go(location.hash);
      //   } else if (doc.type == "thread") {
      //     // redraw the sidebar
      //     var route = /threads/.test(location.hash) ? location.hash : "/threads";
      //     sidebarRouter.go(route);
      //     // get new channels from sync server
      //     resync();
      //   }
      // });
    });
  });
});
