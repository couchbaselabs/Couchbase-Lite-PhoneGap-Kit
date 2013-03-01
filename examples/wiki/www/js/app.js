$(function() {
  var route = require('./route'),
    config = require('./app/config'),
    auth = require('./app/auth'),
    // sync = require('./app/sync'),
    // register controllers
    home = require("./app/home")(route),
    wikis = require("./app/wikis")(route),
    edits = require("./app/edits")(route),
    sidebar = require("./app/sidebar")(route);

  home.ready();
  sidebar.draw();

  coux.changes(config.dbUrl, function(err, changes) {
      console.log("change", err, changes);
      sidebar.draw();

      var matches = window.location.toString().match(/^[^#]*#(.+)$/);
      if (matches && matches[1] && !/edit/.test(matches[1])) {
          route.go(matches[1])
      }
  });

});

