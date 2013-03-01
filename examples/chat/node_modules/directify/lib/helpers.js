var deepExtend = require('deep-extend');

var rtrim = require('./rtrim');

var jsonRegex = /(\{.+:?.+\}$)/;

module.exports = {
  jsonRegex: jsonRegex,

  // Called before each matching route
  // stores the current path in @path
  setPath: function() {
    // var arg, args, _i, _len;
    this.path = location.hash;
    
    for (var i = arguments.length - 1; i >= 0; i--) {
      var arg = arguments[i];
      this.path = rtrim(this.path, arg);
      this.path = this.path.replace(/\/$/, '');
    }

    if ($) {
      $(window).trigger('pathChange', this.path);
    }
    return this.path;
  },

  // Called before each matching route
  // stores the current params in this.params
  // sets this.params to {} if none are found
  setParams: function() {
    this.params = {};
    var lastParam = Array.prototype.slice.call(arguments, -1)[0];
    if (lastParam && jsonRegex.test(lastParam)) {
      try {
        this.params = JSON.parse(lastParam);
      } catch (err) {
        // Error parsing JSON...
      }
    }
  },

  // Ensures that required params are present
  // in this.params, if not, they are set to defaults
  // and the url hash is updated
  // this does not trigger a navigation event
  ensureParams: function(required) {
    this.updateParams(deepExtend(required, this.params), {
      navigate: false
    });
  },

  // Updates the url hash with provided params
  // triggers a navigation event by default
  // pass {navigate: false} to avoid this
  updateParams: function(newParams, opts) {
    opts = opts || {};
    
    if (!(opts.navigate === false)) {
      opts.navigate = true;
    }

    var params = deepExtend(this.params, newParams),
        path = this.path,
        href = "" + path + "/" + (JSON.stringify(params));

    if (opts.navigate) {
      window.location.href = href;
    } else {
      var hcCopy = window.onhashchange;
      window.onhashchange = function() {};
      window.location.href = href;
      setTimeout(function() {
        window.onhashchange = hcCopy;
      }, 10);
    }
    
  }
};
