// requires pathbinder plugin
var content = $("#content"),
  route = content.bindPath;

module.exports = function() {
  console.log(arguments)
  route.apply(this, arguments)
};

module.exports.begin = function(name) {
  $.pathbinder.begin(name);
};

module.exports.go = function(name) {
  $.pathbinder.go(name);
};
