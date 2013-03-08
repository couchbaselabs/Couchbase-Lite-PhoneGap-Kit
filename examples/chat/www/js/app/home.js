var config = require('./config');

exports.index = function() {
  // render index content html
  var elem = $(this);
  console.log(["config.email", config.email]);
  elem.html(config.t.index({user: config.email}))
}
