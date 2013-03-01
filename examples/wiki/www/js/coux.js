// coux is a tiny couch client, there are implementations for server side and client side
// this implementation is for Zepto or jQuery.
function coux(opts, body) {
  var query = [], k, v, q, cb = arguments[arguments.length-1]
    , req = {
      type: 'GET',
      dataType: 'json',
      contentType: 'application/json',
      success: function(doc) {
        // console.log(["coux json", doc])
        if (!doc || doc.error) {
          cb(doc);
        } else {
          cb(false, doc);
        }
      },
      error: function(e) {
        // console.log(e.responseText || e)
        // console.log(opts.url)
        cb(e)
      }
  };
    if (typeof opts === 'string' || $.isArray(opts)) {
        opts = {url:opts};
    }
    if (arguments.length == 3) {
        opts.data = JSON.stringify(body);
    }
    opts.url = opts.url || opts.uri;
    delete opts.uri;
    if ($.isArray(opts.url)) {
        if (typeof opts.url[opts.url.length-1] == 'object') {
            q = opts.url[opts.url.length-1];
            opts.url = opts.url.slice(0, opts.url.length-1);
            for (k in q) {
                if (['startkey', 'endkey', 'key'].indexOf(k) !== -1) {
                    v = JSON.stringify(q[k])
                } else {
                    v = q[k];
                }
                query.push(encodeURIComponent(k)+'='+encodeURIComponent(v));
            }
            query = query.join('&');
        }

        var first = true;
        opts.url = (opts.url.map(function(path) {
            if (first) {
                first = false;
                if (/^http/.test(path)) {
                  if (/\/$/.test(path)) {
                    return path.substring(0,path.length-1)
                  } else {
                    return path;
                  }
                }
            }
            return encodeURIComponent(path);
        })).join('/');

        if (query.toString()) {
            opts.url = opts.url + "?" + query.toString();
        }
    }
    for (var x in opts) {
        if (opts.hasOwnProperty(x)){
            req[x] = opts[x];
        }
    }
    // console.log(["coux req", req])
    $.ajax(req);
};

coux.put = function() {
    var opts = arguments[0];
    if (typeof opts === 'string' || Array.isArray(opts)) {
        opts = {url:opts};
    }
    opts.type = "PUT";
    arguments[0] = opts;
    coux.apply(this, arguments);
};


coux.post = function() {
    var opts = arguments[0];
    if (typeof opts === 'string' || Array.isArray(opts)) {
        opts = {url:opts};
    }
    opts.type = "POST";
    arguments[0] = opts;
    coux.apply(this, arguments);
};

coux.del = function() {
    var opts = arguments[0];
    if (typeof opts === 'string' || Array.isArray(opts)) {
        opts = {url:opts};
    }
    opts.type = "DELETE";
    arguments[0] = opts;
    coux.apply(this, arguments);
};

coux.get = coux;

coux.changes = function(dbname, onDBChange) {
    var since = 0;
    function changesCallback(opts) {
      since = opts.last_seq || since;
      if (opts.results) {onDBChange(opts);}
      coux([dbname, '_changes', {feed : 'longpoll', since : since}], function(err, data) {
          if (!err) {
              changesCallback(data)
          } else {
              setTimeout(function() {
                if (console && console.log) {
                    console.log("error changes", err);
                    console.log(opts);
                }
                changesCallback({last_seq : since});
              }, 2500)
          }
      });
    }
    changesCallback({last_seq : 0});
};
