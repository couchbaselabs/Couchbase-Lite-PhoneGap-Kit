var config = require("./config");

exports.setUser = function(user, cb) {
  coux.put([config.dbUrl, "_local/user"], user, cb);
};

exports.getUser = function(cb) {
  coux([config.dbUrl, "_local/user"], cb);
};

