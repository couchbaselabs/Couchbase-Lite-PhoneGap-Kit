$(function() {
  var config = require('./app/config'),
    home = require("./app/home"),
    thread = require("./app/thread"),
    auth = require('./app/auth'),
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
      "/login" : auth.login,
      // "/reload" : home.reload,
      // "/reloaded" : home.reloaded,
      "/" : home.index,
      // "/ready" : home.ready,
      "/threads/new" : thread.create,
      "/thread/:id" : thread.view
    },
    sidebar = $("#sidebar")[0],
    sidebarRoutes = {
      "/threads" : thread.index,
      "/thread/:id" : thread.index
    };

  function initSyncOrLogin (cb) {
    console.log("initSyncOrLogin")
    auth.getUser(function(no, user) {
      if (no) {
        location.hash="/login";
      } else {
        var resync = sync.trigger(user, function(err, ok) {
          if (err && err.error !== "exists") {
            console.log("sync err: " + JSON.stringify(err));
          } else {
            // ok
            console.log("init ok")
            cb(false, resync);
          }
        });
      }
    });
  }

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
  function appInit() {
    var contentRouter = router(contentRoutes, content);
    contentRouter.init();
    var sidebarRouter = router(sidebarRoutes, sidebar);
    sidebarRouter.init("/threads");
    // touchlink(sidebar);
    initSyncOrLogin(function(err, resync){
      if (err) {
        console.log("login err", err);
        return;
      }
      setupChanges(function(doc){
        // console.log(["change",location.hash, doc]);
        var currentThread = location.hash.split('/').pop();
        if (doc.type == "message" && doc.thread_id == currentThread) {
          // redraw the chat
          // console.log("chat redraw", currentThread)
          contentRouter.go(location.hash);
        } else if (doc.type == "thread") {
          // redraw the sidebar
          var route = /threads/.test(location.hash) ? location.hash : "/threads";
          sidebarRouter.go(route);
          // get new channels from sync server
          resync();
        }
      });
    });

  }

  config.setup(function(err, ok){
    if (err) {
      return console.log(err);
    }
    appInit();
  });


});

