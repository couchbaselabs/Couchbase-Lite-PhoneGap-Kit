window.presentBrowserIdDialog = function(origin, callback) {
  // use node.js style error reporting (first argument)
  cordova.exec(function(assertion){
    callback(false, assertion);
  }, function(err) {
   callback(err);
 }, "CBCordovaBrowserId", "presentBrowserIdDialog", [origin]);
};
