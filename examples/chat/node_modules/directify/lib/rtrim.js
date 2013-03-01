module.exports = function(str, substr) {
  var i, search;
  i = str.length - 1;
  while (i >= 0) {
    search = str.substring(i, str.length);
    if (substr === search) {
      str = str.substring(0, i);
      break;
    }
    i--;
  }
  return str;
};