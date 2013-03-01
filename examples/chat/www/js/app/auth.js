var config = require("./config"),
  db = config.db;

exports.setUser = function(user, cb) {
  db.put("_local/user", user, cb);
};

exports.getUser = function(cb) {
  db("_local/user", cb);
};

var auth = exports;
exports.login = function() {
  auth.getUser(function(no, user) {
    if (!no) {
      location.hash = "/";
    } else {
      $('#content').html(config.t.login({}));
      $("#content form").submit(function(e) {
        e.preventDefault();
        var me = $("input[type=text]",this).val(),
          pass = $("input[type=password]",this).val();
        auth.setUser({user : me, pass: pass}, function(err, ok) {
          if (err) {return console.log(err)};
          location.hash = "/";
          location.reload();
        });
      });
    }
  })
};
