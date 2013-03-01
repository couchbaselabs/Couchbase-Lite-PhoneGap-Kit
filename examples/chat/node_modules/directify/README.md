## Directify ##

Directify is a client-side router, actually it's pretty much Director.js (included) with some additional features/tweaks.

Example usage:

```javascript
var router = require('directify');

// Usage: router(routingTable, targetElement);

var routingTable = {
  '/': function() {
    return this.target.innerHTML = 'This is the root url.';
  },

  '/systems': function() {
    return this.target.innerHTML = "This is another path, it is: " + this.path;
  },

  '/parent': {
    '/sub/:json': function() {
      return this.target.innerHTML = "This path takes json params, they are: " + (JSON.stringify(this.params));
    }
  }
};

$(document).ready(function() {
  var targetElement = document.getElementById('main');
  router(routingTable, targetElement);
});
```