var config = require('./config'),
  auth = require('./auth');

// exports.reload = function() {
//   location.hash="#/reloaded";
//   // location.reload()
// };
// exports.reloaded = function() {
//   location.hash="/";
// };

exports.index = function() {
  // render index content html
  var elem = $(this);
  auth.getUser(function(err, user){
    elem.html(config.t.index(user))
  });
}


