(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",Function(['require','module','exports','__dirname','__filename','process','global'],"function filter (xs, fn) {\n    var res = [];\n    for (var i = 0; i < xs.length; i++) {\n        if (fn(xs[i], i, xs)) res.push(xs[i]);\n    }\n    return res;\n}\n\n// resolves . and .. elements in a path array with directory names there\n// must be no slashes, empty elements, or device names (c:\\) in the array\n// (so also no leading and trailing slashes - it does not distinguish\n// relative and absolute paths)\nfunction normalizeArray(parts, allowAboveRoot) {\n  // if the path tries to go above the root, `up` ends up > 0\n  var up = 0;\n  for (var i = parts.length; i >= 0; i--) {\n    var last = parts[i];\n    if (last == '.') {\n      parts.splice(i, 1);\n    } else if (last === '..') {\n      parts.splice(i, 1);\n      up++;\n    } else if (up) {\n      parts.splice(i, 1);\n      up--;\n    }\n  }\n\n  // if the path is allowed to go above the root, restore leading ..s\n  if (allowAboveRoot) {\n    for (; up--; up) {\n      parts.unshift('..');\n    }\n  }\n\n  return parts;\n}\n\n// Regex to split a filename into [*, dir, basename, ext]\n// posix version\nvar splitPathRe = /^(.+\\/(?!$)|\\/)?((?:.+?)?(\\.[^.]*)?)$/;\n\n// path.resolve([from ...], to)\n// posix version\nexports.resolve = function() {\nvar resolvedPath = '',\n    resolvedAbsolute = false;\n\nfor (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {\n  var path = (i >= 0)\n      ? arguments[i]\n      : process.cwd();\n\n  // Skip empty and invalid entries\n  if (typeof path !== 'string' || !path) {\n    continue;\n  }\n\n  resolvedPath = path + '/' + resolvedPath;\n  resolvedAbsolute = path.charAt(0) === '/';\n}\n\n// At this point the path should be resolved to a full absolute path, but\n// handle relative paths to be safe (might happen when process.cwd() fails)\n\n// Normalize the path\nresolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {\n    return !!p;\n  }), !resolvedAbsolute).join('/');\n\n  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';\n};\n\n// path.normalize(path)\n// posix version\nexports.normalize = function(path) {\nvar isAbsolute = path.charAt(0) === '/',\n    trailingSlash = path.slice(-1) === '/';\n\n// Normalize the path\npath = normalizeArray(filter(path.split('/'), function(p) {\n    return !!p;\n  }), !isAbsolute).join('/');\n\n  if (!path && !isAbsolute) {\n    path = '.';\n  }\n  if (path && trailingSlash) {\n    path += '/';\n  }\n  \n  return (isAbsolute ? '/' : '') + path;\n};\n\n\n// posix version\nexports.join = function() {\n  var paths = Array.prototype.slice.call(arguments, 0);\n  return exports.normalize(filter(paths, function(p, index) {\n    return p && typeof p === 'string';\n  }).join('/'));\n};\n\n\nexports.dirname = function(path) {\n  var dir = splitPathRe.exec(path)[1] || '';\n  var isWindows = false;\n  if (!dir) {\n    // No dirname\n    return '.';\n  } else if (dir.length === 1 ||\n      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {\n    // It is just a slash or a drive letter with a slash\n    return dir;\n  } else {\n    // It is a full dirname, strip trailing slash\n    return dir.substring(0, dir.length - 1);\n  }\n};\n\n\nexports.basename = function(path, ext) {\n  var f = splitPathRe.exec(path)[2] || '';\n  // TODO: make this comparison case-insensitive on windows?\n  if (ext && f.substr(-1 * ext.length) === ext) {\n    f = f.substr(0, f.length - ext.length);\n  }\n  return f;\n};\n\n\nexports.extname = function(path) {\n  return splitPathRe.exec(path)[3] || '';\n};\n\n//@ sourceURL=path"
));

require.define("__browserify_process",Function(['require','module','exports','__dirname','__filename','process','global'],"var process = module.exports = {};\n\nprocess.nextTick = (function () {\n    var canSetImmediate = typeof window !== 'undefined'\n        && window.setImmediate;\n    var canPost = typeof window !== 'undefined'\n        && window.postMessage && window.addEventListener\n    ;\n\n    if (canSetImmediate) {\n        return function (f) { return window.setImmediate(f) };\n    }\n\n    if (canPost) {\n        var queue = [];\n        window.addEventListener('message', function (ev) {\n            if (ev.source === window && ev.data === 'browserify-tick') {\n                ev.stopPropagation();\n                if (queue.length > 0) {\n                    var fn = queue.shift();\n                    fn();\n                }\n            }\n        }, true);\n\n        return function nextTick(fn) {\n            queue.push(fn);\n            window.postMessage('browserify-tick', '*');\n        };\n    }\n\n    return function nextTick(fn) {\n        setTimeout(fn, 0);\n    };\n})();\n\nprocess.title = 'browser';\nprocess.browser = true;\nprocess.env = {};\nprocess.argv = [];\n\nprocess.binding = function (name) {\n    if (name === 'evals') return (require)('vm')\n    else throw new Error('No such module. (Possibly not yet loaded)')\n};\n\n(function () {\n    var cwd = '/';\n    var path;\n    process.cwd = function () { return cwd };\n    process.chdir = function (dir) {\n        if (!path) path = require('path');\n        cwd = path.resolve(dir, cwd);\n    };\n})();\n\n//@ sourceURL=__browserify_process"
));

require.define("/node_modules/mustache/package.json",Function(['require','module','exports','__dirname','__filename','process','global'],"module.exports = {\"main\":\"./mustache.js\"}\n//@ sourceURL=/node_modules/mustache/package.json"
));

require.define("/node_modules/mustache/mustache.js",Function(['require','module','exports','__dirname','__filename','process','global'],"/*!\n * mustache.js - Logic-less {{mustache}} templates with JavaScript\n * http://github.com/janl/mustache.js\n */\n\n/*global define: false*/\n\nvar Mustache;\n\n(function (exports) {\n  if (typeof module !== \"undefined\" && module.exports) {\n    module.exports = exports; // CommonJS\n  } else if (typeof define === \"function\") {\n    define(exports); // AMD\n  } else {\n    Mustache = exports; // <script>\n  }\n}((function () {\n\n  var exports = {};\n\n  exports.name = \"mustache.js\";\n  exports.version = \"0.7.1\";\n  exports.tags = [\"{{\", \"}}\"];\n\n  exports.Scanner = Scanner;\n  exports.Context = Context;\n  exports.Writer = Writer;\n\n  var whiteRe = /\\s*/;\n  var spaceRe = /\\s+/;\n  var nonSpaceRe = /\\S/;\n  var eqRe = /\\s*=/;\n  var curlyRe = /\\s*\\}/;\n  var tagRe = /#|\\^|\\/|>|\\{|&|=|!/;\n\n  // Workaround for https://issues.apache.org/jira/browse/COUCHDB-577\n  // See https://github.com/janl/mustache.js/issues/189\n  function testRe(re, string) {\n    return RegExp.prototype.test.call(re, string);\n  }\n\n  function isWhitespace(string) {\n    return !testRe(nonSpaceRe, string);\n  }\n\n  var isArray = Array.isArray || function (obj) {\n    return Object.prototype.toString.call(obj) === \"[object Array]\";\n  };\n\n  function escapeRe(string) {\n    return string.replace(/[\\-\\[\\]{}()*+?.,\\\\\\^$|#\\s]/g, \"\\\\$&\");\n  }\n\n  var entityMap = {\n    \"&\": \"&amp;\",\n    \"<\": \"&lt;\",\n    \">\": \"&gt;\",\n    '\"': '&quot;',\n    \"'\": '&#39;',\n    \"/\": '&#x2F;'\n  };\n\n  function escapeHtml(string) {\n    return String(string).replace(/[&<>\"'\\/]/g, function (s) {\n      return entityMap[s];\n    });\n  }\n\n  // Export the escaping function so that the user may override it.\n  // See https://github.com/janl/mustache.js/issues/244\n  exports.escape = escapeHtml;\n\n  function Scanner(string) {\n    this.string = string;\n    this.tail = string;\n    this.pos = 0;\n  }\n\n  /**\n   * Returns `true` if the tail is empty (end of string).\n   */\n  Scanner.prototype.eos = function () {\n    return this.tail === \"\";\n  };\n\n  /**\n   * Tries to match the given regular expression at the current position.\n   * Returns the matched text if it can match, the empty string otherwise.\n   */\n  Scanner.prototype.scan = function (re) {\n    var match = this.tail.match(re);\n\n    if (match && match.index === 0) {\n      this.tail = this.tail.substring(match[0].length);\n      this.pos += match[0].length;\n      return match[0];\n    }\n\n    return \"\";\n  };\n\n  /**\n   * Skips all text until the given regular expression can be matched. Returns\n   * the skipped string, which is the entire tail if no match can be made.\n   */\n  Scanner.prototype.scanUntil = function (re) {\n    var match, pos = this.tail.search(re);\n\n    switch (pos) {\n    case -1:\n      match = this.tail;\n      this.pos += this.tail.length;\n      this.tail = \"\";\n      break;\n    case 0:\n      match = \"\";\n      break;\n    default:\n      match = this.tail.substring(0, pos);\n      this.tail = this.tail.substring(pos);\n      this.pos += pos;\n    }\n\n    return match;\n  };\n\n  function Context(view, parent) {\n    this.view = view;\n    this.parent = parent;\n    this.clearCache();\n  }\n\n  Context.make = function (view) {\n    return (view instanceof Context) ? view : new Context(view);\n  };\n\n  Context.prototype.clearCache = function () {\n    this._cache = {};\n  };\n\n  Context.prototype.push = function (view) {\n    return new Context(view, this);\n  };\n\n  Context.prototype.lookup = function (name) {\n    var value = this._cache[name];\n\n    if (!value) {\n      if (name === \".\") {\n        value = this.view;\n      } else {\n        var context = this;\n\n        while (context) {\n          if (name.indexOf(\".\") > 0) {\n            var names = name.split(\".\"), i = 0;\n\n            value = context.view;\n\n            while (value && i < names.length) {\n              value = value[names[i++]];\n            }\n          } else {\n            value = context.view[name];\n          }\n\n          if (value != null) {\n            break;\n          }\n\n          context = context.parent;\n        }\n      }\n\n      this._cache[name] = value;\n    }\n\n    if (typeof value === \"function\") {\n      value = value.call(this.view);\n    }\n\n    return value;\n  };\n\n  function Writer() {\n    this.clearCache();\n  }\n\n  Writer.prototype.clearCache = function () {\n    this._cache = {};\n    this._partialCache = {};\n  };\n\n  Writer.prototype.compile = function (template, tags) {\n    var fn = this._cache[template];\n\n    if (!fn) {\n      var tokens = exports.parse(template, tags);\n      fn = this._cache[template] = this.compileTokens(tokens, template);\n    }\n\n    return fn;\n  };\n\n  Writer.prototype.compilePartial = function (name, template, tags) {\n    var fn = this.compile(template, tags);\n    this._partialCache[name] = fn;\n    return fn;\n  };\n\n  Writer.prototype.compileTokens = function (tokens, template) {\n    var fn = compileTokens(tokens);\n    var self = this;\n\n    return function (view, partials) {\n      if (partials) {\n        if (typeof partials === \"function\") {\n          self._loadPartial = partials;\n        } else {\n          for (var name in partials) {\n            self.compilePartial(name, partials[name]);\n          }\n        }\n      }\n\n      return fn(self, Context.make(view), template);\n    };\n  };\n\n  Writer.prototype.render = function (template, view, partials) {\n    return this.compile(template)(view, partials);\n  };\n\n  Writer.prototype._section = function (name, context, text, callback) {\n    var value = context.lookup(name);\n\n    switch (typeof value) {\n    case \"object\":\n      if (isArray(value)) {\n        var buffer = \"\";\n\n        for (var i = 0, len = value.length; i < len; ++i) {\n          buffer += callback(this, context.push(value[i]));\n        }\n\n        return buffer;\n      }\n\n      return value ? callback(this, context.push(value)) : \"\";\n    case \"function\":\n      var self = this;\n      var scopedRender = function (template) {\n        return self.render(template, context);\n      };\n\n      var result = value.call(context.view, text, scopedRender);\n      return result != null ? result : \"\";\n    default:\n      if (value) {\n        return callback(this, context);\n      }\n    }\n\n    return \"\";\n  };\n\n  Writer.prototype._inverted = function (name, context, callback) {\n    var value = context.lookup(name);\n\n    // Use JavaScript's definition of falsy. Include empty arrays.\n    // See https://github.com/janl/mustache.js/issues/186\n    if (!value || (isArray(value) && value.length === 0)) {\n      return callback(this, context);\n    }\n\n    return \"\";\n  };\n\n  Writer.prototype._partial = function (name, context) {\n    if (!(name in this._partialCache) && this._loadPartial) {\n      this.compilePartial(name, this._loadPartial(name));\n    }\n\n    var fn = this._partialCache[name];\n\n    return fn ? fn(context) : \"\";\n  };\n\n  Writer.prototype._name = function (name, context) {\n    var value = context.lookup(name);\n\n    if (typeof value === \"function\") {\n      value = value.call(context.view);\n    }\n\n    return (value == null) ? \"\" : String(value);\n  };\n\n  Writer.prototype._escaped = function (name, context) {\n    return exports.escape(this._name(name, context));\n  };\n\n  /**\n   * Calculates the bounds of the section represented by the given `token` in\n   * the original template by drilling down into nested sections to find the\n   * last token that is part of that section. Returns an array of [start, end].\n   */\n  function sectionBounds(token) {\n    var start = token[3];\n    var end = start;\n\n    var tokens;\n    while ((tokens = token[4]) && tokens.length) {\n      token = tokens[tokens.length - 1];\n      end = token[3];\n    }\n\n    return [start, end];\n  }\n\n  /**\n   * Low-level function that compiles the given `tokens` into a function\n   * that accepts three arguments: a Writer, a Context, and the template.\n   */\n  function compileTokens(tokens) {\n    var subRenders = {};\n\n    function subRender(i, tokens, template) {\n      if (!subRenders[i]) {\n        var fn = compileTokens(tokens);\n        subRenders[i] = function (writer, context) {\n          return fn(writer, context, template);\n        };\n      }\n\n      return subRenders[i];\n    }\n\n    return function (writer, context, template) {\n      var buffer = \"\";\n      var token, sectionText;\n\n      for (var i = 0, len = tokens.length; i < len; ++i) {\n        token = tokens[i];\n\n        switch (token[0]) {\n        case \"#\":\n          sectionText = template.slice.apply(template, sectionBounds(token));\n          buffer += writer._section(token[1], context, sectionText, subRender(i, token[4], template));\n          break;\n        case \"^\":\n          buffer += writer._inverted(token[1], context, subRender(i, token[4], template));\n          break;\n        case \">\":\n          buffer += writer._partial(token[1], context);\n          break;\n        case \"&\":\n          buffer += writer._name(token[1], context);\n          break;\n        case \"name\":\n          buffer += writer._escaped(token[1], context);\n          break;\n        case \"text\":\n          buffer += token[1];\n          break;\n        }\n      }\n\n      return buffer;\n    };\n  }\n\n  /**\n   * Forms the given array of `tokens` into a nested tree structure where\n   * tokens that represent a section have a fifth item: an array that contains\n   * all tokens in that section.\n   */\n  function nestTokens(tokens) {\n    var tree = [];\n    var collector = tree;\n    var sections = [];\n    var token, section;\n\n    for (var i = 0; i < tokens.length; ++i) {\n      token = tokens[i];\n\n      switch (token[0]) {\n      case \"#\":\n      case \"^\":\n        token[4] = [];\n        sections.push(token);\n        collector.push(token);\n        collector = token[4];\n        break;\n      case \"/\":\n        if (sections.length === 0) {\n          throw new Error(\"Unopened section: \" + token[1]);\n        }\n\n        section = sections.pop();\n\n        if (section[1] !== token[1]) {\n          throw new Error(\"Unclosed section: \" + section[1]);\n        }\n\n        if (sections.length > 0) {\n          collector = sections[sections.length - 1][4];\n        } else {\n          collector = tree;\n        }\n        break;\n      default:\n        collector.push(token);\n      }\n    }\n\n    // Make sure there were no open sections when we're done.\n    section = sections.pop();\n\n    if (section) {\n      throw new Error(\"Unclosed section: \" + section[1]);\n    }\n\n    return tree;\n  }\n\n  /**\n   * Combines the values of consecutive text tokens in the given `tokens` array\n   * to a single token.\n   */\n  function squashTokens(tokens) {\n    var token, lastToken, squashedTokens = [];\n\n    for (var i = 0; i < tokens.length; ++i) {\n      token = tokens[i];\n\n      if (lastToken && lastToken[0] === \"text\" && token[0] === \"text\") {\n        lastToken[1] += token[1];\n        lastToken[3] = token[3];\n      } else {\n        lastToken = token;\n        squashedTokens.push(token);\n      }\n    }\n\n    return squashedTokens;\n  }\n\n  function escapeTags(tags) {\n    if (tags.length !== 2) {\n      throw new Error(\"Invalid tags: \" + tags.join(\" \"));\n    }\n\n    return [\n      new RegExp(escapeRe(tags[0]) + \"\\\\s*\"),\n      new RegExp(\"\\\\s*\" + escapeRe(tags[1]))\n    ];\n  }\n\n  /**\n   * Breaks up the given `template` string into a tree of token objects. If\n   * `tags` is given here it must be an array with two string values: the\n   * opening and closing tags used in the template (e.g. [\"<%\", \"%>\"]). Of\n   * course, the default is to use mustaches (i.e. Mustache.tags).\n   */\n  exports.parse = function (template, tags) {\n    template = template || '';\n    tags = tags || exports.tags;\n\n    var tagRes = escapeTags(tags);\n    var scanner = new Scanner(template);\n\n    var tokens = [],      // Buffer to hold the tokens\n        spaces = [],      // Indices of whitespace tokens on the current line\n        hasTag = false,   // Is there a {{tag}} on the current line?\n        nonSpace = false; // Is there a non-space char on the current line?\n\n    // Strips all whitespace tokens array for the current line\n    // if there was a {{#tag}} on it and otherwise only space.\n    function stripSpace() {\n      if (hasTag && !nonSpace) {\n        while (spaces.length) {\n          tokens.splice(spaces.pop(), 1);\n        }\n      } else {\n        spaces = [];\n      }\n\n      hasTag = false;\n      nonSpace = false;\n    }\n\n    var start, type, value, chr;\n\n    while (!scanner.eos()) {\n      start = scanner.pos;\n      value = scanner.scanUntil(tagRes[0]);\n\n      if (value) {\n        for (var i = 0, len = value.length; i < len; ++i) {\n          chr = value.charAt(i);\n\n          if (isWhitespace(chr)) {\n            spaces.push(tokens.length);\n          } else {\n            nonSpace = true;\n          }\n\n          tokens.push([\"text\", chr, start, start + 1]);\n          start += 1;\n\n          if (chr === \"\\n\") {\n            stripSpace(); // Check for whitespace on the current line.\n          }\n        }\n      }\n\n      start = scanner.pos;\n\n      // Match the opening tag.\n      if (!scanner.scan(tagRes[0])) {\n        break;\n      }\n\n      hasTag = true;\n      type = scanner.scan(tagRe) || \"name\";\n\n      // Skip any whitespace between tag and value.\n      scanner.scan(whiteRe);\n\n      // Extract the tag value.\n      if (type === \"=\") {\n        value = scanner.scanUntil(eqRe);\n        scanner.scan(eqRe);\n        scanner.scanUntil(tagRes[1]);\n      } else if (type === \"{\") {\n        var closeRe = new RegExp(\"\\\\s*\" + escapeRe(\"}\" + tags[1]));\n        value = scanner.scanUntil(closeRe);\n        scanner.scan(curlyRe);\n        scanner.scanUntil(tagRes[1]);\n        type = \"&\";\n      } else {\n        value = scanner.scanUntil(tagRes[1]);\n      }\n\n      // Match the closing tag.\n      if (!scanner.scan(tagRes[1])) {\n        throw new Error(\"Unclosed tag at \" + scanner.pos);\n      }\n\n      tokens.push([type, value, start, scanner.pos]);\n\n      if (type === \"name\" || type === \"{\" || type === \"&\") {\n        nonSpace = true;\n      }\n\n      // Set the tags for the next time around.\n      if (type === \"=\") {\n        tags = value.split(spaceRe);\n        tagRes = escapeTags(tags);\n      }\n    }\n\n    tokens = squashTokens(tokens);\n\n    return nestTokens(tokens);\n  };\n\n  // The high-level clearCache, compile, compilePartial, and render functions\n  // use this default writer.\n  var _writer = new Writer();\n\n  /**\n   * Clears all cached templates and partials in the default writer.\n   */\n  exports.clearCache = function () {\n    return _writer.clearCache();\n  };\n\n  /**\n   * Compiles the given `template` to a reusable function using the default\n   * writer.\n   */\n  exports.compile = function (template, tags) {\n    return _writer.compile(template, tags);\n  };\n\n  /**\n   * Compiles the partial with the given `name` and `template` to a reusable\n   * function using the default writer.\n   */\n  exports.compilePartial = function (name, template, tags) {\n    return _writer.compilePartial(name, template, tags);\n  };\n\n  /**\n   * Compiles the given array of tokens (the output of a parse) to a reusable\n   * function using the default writer.\n   */\n  exports.compileTokens = function (tokens, template) {\n    return _writer.compileTokens(tokens, template);\n  };\n\n  /**\n   * Renders the `template` with the given `view` and `partials` using the\n   * default writer.\n   */\n  exports.render = function (template, view, partials) {\n    return _writer.render(template, view, partials);\n  };\n\n  // This is here for backwards compatibility with 0.4.x.\n  exports.to_html = function (template, view, partials, send) {\n    var result = exports.render(template, view, partials);\n\n    if (typeof send === \"function\") {\n      send(result);\n    } else {\n      return result;\n    }\n  };\n\n  return exports;\n\n}())));\n\n//@ sourceURL=/node_modules/mustache/mustache.js"
));

require.define("/www/js/app/config.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var config = module.exports = {t : {}};\n\nconfig.dbHost = 'http://localhost.touchdb.';\n\nconfig.sync = 'http://animal.local:3000/channels/';\n\nconfig.syncTarget = 'animal.local:4984/basecouch';\n\nif (location.protocol != \"file:\") {\n  config.dbHost = location.origin;\n}\n\nconfig.dbUrl = config.dbHost + '/wiki';\n\n$('script[type=\"text/mustache\"]').each(function() {\n    var id = this.id.split('-');\n    id.pop();\n    module.exports.t[id.join('-')] = $(this).html();\n});\n\n//@ sourceURL=/www/js/app/config.js"
));

require.define("/www/js/app/auth.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var config = require(\"./config\");\n\nexports.setUser = function(user, cb) {\n  coux.put([config.dbUrl, \"_local/user\"], user, cb);\n};\n\nexports.getUser = function(cb) {\n  coux([config.dbUrl, \"_local/user\"], cb);\n};\n\n\n//@ sourceURL=/www/js/app/auth.js"
));

require.define("/www/js/app/edits.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var mu = require(\"mustache\").render,\n  auth = require(\"./auth\"),\n  config = require(\"./config\");\n\nmodule.exports = function(route) {\n  // edit the front page of a wiki\n  route(\"/edit/:id\", function(e, params) {\n    var newWiki;\n    auth.getUser(function(no, user) {\n      if (no) {\n        route.go(\"/start\");\n      } else {\n        newWiki = {\n          _id : params.id == \"_new\" ? (\"\"+Math.random()).slice(2) : params.id,\n          created_at : new Date(),\n          members : user.user, // todo 'name'\n          type : \"wiki\"\n        };\n        newWiki.wiki_id = newWiki._id;\n        if (params.id == \"_new\") {\n            console.log(\"_newWiki\",newWiki);\n            withWiki(false, newWiki);\n        } else {\n            console.log(\"get wiki\");\n            coux.get([config.dbUrl,params.id], withWiki);\n        }\n      }\n    });\n      function withWiki(err, wiki) {\n          if (err) {\n              console.log(\"withWiki\", err)\n              wiki = newWiki;\n          }\n          console.log(\"edit form\");\n          $('#content').html(mu(config.t['edit-wiki'], wiki));\n          $('input.save').click(function() {\n              $('#content form').submit();\n          });\n          $('#content form').submit(function(e) {\n              e.preventDefault();\n              wiki.title = $(\"[name=title]\").val();\n              wiki.markdown = $(\"textarea\",this).val();\n              wiki.tags = $(\"[name=tags]\",this).val();\n              wiki.members = $(\"[name=members]\",this).val();\n              wiki.updated_at = new Date();\n              coux.put([config.dbUrl,wiki._id], wiki, function(err, ok) {\n                  console.log(\"saved\", err, ok);\n                  if (!err) route.go(\"/wiki/\"+wiki._id);\n              });\n          });\n      }\n\n  });\n\n\n  function editNestedPage (page) {\n\n  }\n  // edit any other page of a wiki\n  route(\"/edit/:id/:page\", function(e, params) {\n      currentWiki = params.id;\n      coux.get([config.dbUrl,params.id], function(err, wiki) {\n          if (!err) {\n              coux.get([config.dbUrl,params.id+':'+params.page], function(err, page) {\n                  if (err) {\n                      page = {\n                          _id : params.id+':'+params.page,\n                          created_at : new Date(),\n                          type : \"page\",\n                          wiki_id : params.id\n                      };\n                  }\n                  var data = {\n                      markdown : page.markdown,\n                      title : wiki.title,\n                      wiki_id : params.id,\n                      page_id : params.page\n                  };\n                  $('#content').html(mu(config.t['edit-page'], data));\n                  $('input.save').click(function() {\n                      $('#content form').submit();\n                  });\n                  $('#content form').submit(function(e) {\n                      e.preventDefault();\n                      page.markdown = $(\"textarea\", this).val();\n                      wiki.updated_at = page.updated_at = new Date();\n                      coux.put([config.dbUrl,page._id], page, function(err, ok) {\n                          console.log(\"saved\", err, ok);\n                          route.go(\"/wiki/\"+wiki._id+\"/\"+params.page);\n                          coux.put([config.dbUrl, wiki._id], wiki, function() {});\n                      });\n                  });\n\n              });\n          } else {\n              route.go(\"/edit/\"+currentWiki);\n          }\n      });\n  });\n};\n\n//@ sourceURL=/www/js/app/edits.js"
));

require.define("/www/js/app/home.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var config = require('./config'),\n  auth = require('./auth'),\n  sync = require('./sync'),\n  mu = require(\"mustache\").render;\n\nmodule.exports = function(route) {\n  route(\"/home\", function() {\n    // redirect to most recently updated wiki\n    coux.get([config.dbUrl,\"_design\",\"wiki\",\"_view\",\"title\",\n      {descending:true, limit:1}], function(err, view) {\n        var id = (view.rows[0] && view.rows[0].id), path  = \"/wiki/\" + id;\n        if (id) {\n          console.log(\"redirect \"+path);\n          route.go(path);\n        } else {\n          // no wikis, need to make a new one\n          route.go(\"/edit/_new\");\n        }\n    });\n  });\n\n  route(\"/login\", function() {\n    auth.getUser(function(no, user) {\n      if (!no) {\n        route.go(\"/home\");\n      } else {\n        $('#content').html(mu(config.t.login));\n        $(\"#content form\").submit(function(e) {\n          e.preventDefault();\n          var me = $(\"input[type=text]\",this).val(),\n            pass = $(\"input[type=password]\",this).val();\n          auth.setUser({user : me, pass: pass}, function(err, ok) {\n            if (err) throw err;\n            ready(); // triggers initial sync\n          });\n        });\n      }\n    })\n  });\n\n  route(\"/start\", ready);\n\n  function ready() {\n    auth.getUser(function(no, user) {\n      if (no) {\n        route.go(\"/login\");\n      } else {\n        sync.trigger(user, function(err, ok) {\n          if (err) {\n            console.log(\"sync err\", err);\n            route.go(\"/reset\");\n          } else {\n            route.begin(\"/home\");\n          }\n        });\n      }\n    });\n  }\n\n  return {ready:ready};\n};\n\n\n//@ sourceURL=/www/js/app/home.js"
));

require.define("/www/js/app/wikis.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var mu = require(\"mustache\").render,\n  wikiToHtml = require(\"./wikiwords\").wikiToHtml,\n\n  // wikiToHtml = require(\"./sync\").wikiToHtml,\n  config = require(\"./config\");\n\n\n// module?\n\n\n\nmodule.exports = function(route) {\n\n  function drawPage(wiki, page, cb) {\n      currentWiki = wiki._id;\n      var data = {\n          body : wikiToHtml((page || wiki).markdown),\n          tags : wiki.tags,\n          title : wiki.title,\n          members : wiki.members,\n          wiki_id : currentWiki,\n          page_id : (page ? page._id.split(':').pop() : null)\n      };\n      var st = mu(config.t.wiki, data);\n      $('#content').html(st);\n      $('input.save').click(function() {\n          var path = wiki._id;\n          if (page) path += \"/\"+data.page_id;\n          route.go(\"/edit/\"+path);\n      })\n      if (cb) {cb()};\n  };\n  // read the front page of wiki\n  route(\"/wiki/:id\", function(e, params) {\n\n      currentWiki = params.id;\n      coux.get([config.dbUrl,params.id], function(err, doc) {\n          if (err) {\n              console.log(\"error\", err);\n              return;\n          }\n          drawPage(doc, null)\n      });\n  });\n\n  // read any other page of a wiki\n  route(\"/wiki/:id/:page\", function(e, params) {\n\n      currentWiki = params.id;\n      coux.get([config.dbUrl,params.id], function(err, wiki) {\n          if (!err) {\n              coux.get([config.dbUrl,params.id+':'+params.page], function(err, page) {\n                  if (!err) {\n                      drawPage(wiki, page);\n                  } else {\n                      route.go(\"/edit/\"+currentWiki+'/'+params.page);\n                  }\n              });\n          } else {\n              route.go(\"/edit/\"+currentWiki);\n          }\n      });\n  });\n};\n\n//@ sourceURL=/www/js/app/wikis.js"
));

require.define("/www/js/app/sync.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var config = require(\"./config\");\n\n\n\nvar pullRep, pushRep,\n  pullPath = [config.dbHost, \"_replicator\", \"channel_pull\"],\n  pushPath = [config.dbHost, \"_replicator\", \"channel_push\"];\n\nfunction refreshSyncDoc(path, rep, cb) {\n  coux.get(path, function(err, ok) {\n    if (err) {\n      console.log(\"newdoc\", err, path);\n      // make a new doc\n      coux.put(path, rep, cb);\n    } else {\n      // delete it and make a new doc\n      var revpath = path.concat({rev:ok._rev})\n      console.log(\"deleting revpath\", revpath);\n      coux.del(revpath, function(err, ok) {\n        if (err) {\n          console.log(\"couldn't delete\", err, revpath)\n        }\n        coux.put(path, rep, cb);\n      })\n    }\n  });\n}\nfunction refreshSyncOnce(path, rep, cb) {\n  var cancel = JSON.parse(JSON.stringify(rep));\n  cancel.cancel = true;\n  coux.post([config.dbHost, \"_replicate\"], cancel, function() {\n    coux.post([config.dbHost, \"_replicate\"], rep, cb)\n  })\n}\nfunction refreshPush() {\n  var doSync = false ? refreshSyncDoc : refreshSyncOnce;\n  doSync(pushPath, pushRep, function(err, ok) {\n    // console.log(\"pushRep\", err, ok)\n  })\n}\nfunction refreshPull() {\n  var doSync = false ? refreshSyncDoc : refreshSyncOnce;\n  doSync(pullPath, pullRep, function(err, ok) {\n    // console.log(\"pullRep\", err, ok)\n  })\n}\nfunction syncTheseChannels(user, channels) {\n  if (!(channels && channels.length)) return;\n    pullRep = {\n      source : \"http://\"+user.user+\":\"+user.pass+\"@\"+config.syncTarget,\n      target : \"wiki\",\n      continuous : true,\n      filter : \"basecouch/bychannel\",\n      query_params : {\n          channels : channels.join(',')\n      }\n    };\n    pushRep = {\n        target : \"http://\"+user.user+\":\"+user.pass+\"@\"+config.syncTarget,\n        source : \"wiki\",\n        continuous : true\n    };\n    refreshPush()\n    refreshPull()\n}\n\n\nvar syncInterval = false;\nfunction syncForUser(userDoc, cb) {\n  if (!syncInterval) {\n    syncInterval = setInterval(function() {\n      syncForUser(userDoc);\n    },10000);\n  }\n\n  // console.log(\"syncForUser\", userDoc.user);\n                            // silly cache\n  coux.post(config.sync+'?r='+Math.random(), userDoc, function(err, channels) {\n      if (err) console.log(\"ch err\", err);\n      console.log([\"channels\", channels]);\n      if (cb) {cb(err, channels);}\n      syncTheseChannels(userDoc, channels);\n  });\n};\n\nexports.trigger = syncForUser;\n\n\n\n//@ sourceURL=/www/js/app/sync.js"
));

require.define("/www/js/app/sidebar.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var config = require(\"./config\"),\n  mu = require(\"mustache\").render;\n\nmodule.exports = function(route) {\n  return {\n    draw : function(cb) {\n      coux.get([config.dbUrl,\"_design\",\"wiki\",\"_view\",\"title\",\n        {reduce:false, descending:true, limit:100}], function(err, view) {\n          if (err) throw(err);\n          view.rows.forEach(function(row) {\n            row.path = '#/wiki/'+row.id;\n          });\n          console.log(view.rows)\n          var st = mu(config.t.sidebar, view);\n          $('#sidebar').html(st);\n          $(\"#sidebar input.new\").click(function() {\n            route.go(\"#/edit/_new\");\n          })\n          if (cb) {\n            cb(err, view);\n          }\n      });\n    }\n  }\n};\n\n//@ sourceURL=/www/js/app/sidebar.js"
));

require.define("/www/js/app/wikiwords.js",Function(['require','module','exports','__dirname','__filename','process','global'],"var showdownConverter = new Showdown.converter();\n\nfunction wikiToHtml(string) {\n    if (!string) return \"\";\n    var linkPrefix = \"#/wiki/\"+currentWiki+'/';\n    string = string.replace(/([A-Z][a-z]*[A-Z][A-Za-z]*)/gm, \"[$1](\"+linkPrefix+\"$1)\");\n    string = string.replace(/\\[\\[(.*)\\]\\]/gm,\"[$1](\"+linkPrefix+\"$1)\");\n    return showdownConverter.makeHtml(string);\n}\n\nexports.wikiToHtml = wikiToHtml;\n\n//@ sourceURL=/www/js/app/wikiwords.js"
));

require.define("/www/js/route.js",Function(['require','module','exports','__dirname','__filename','process','global'],"// requires pathbinder plugin\nvar content = $(\"#content\"),\n  route = content.bindPath;\n\nmodule.exports = function() {\n  console.log(arguments)\n  route.apply(this, arguments)\n};\n\nmodule.exports.begin = function(name) {\n  $.pathbinder.begin(name);\n};\n\nmodule.exports.go = function(name) {\n  $.pathbinder.go(name);\n};\n\n//@ sourceURL=/www/js/route.js"
));

require.define("/www/js/app.js",Function(['require','module','exports','__dirname','__filename','process','global'],"$(function() {\n  var route = require('./route'),\n    config = require('./app/config'),\n    auth = require('./app/auth'),\n    // sync = require('./app/sync'),\n    // register controllers\n    home = require(\"./app/home\")(route),\n    wikis = require(\"./app/wikis\")(route),\n    edits = require(\"./app/edits\")(route),\n    sidebar = require(\"./app/sidebar\")(route);\n\n  home.ready();\n  sidebar.draw();\n\n  coux.changes(config.dbUrl, function(err, changes) {\n      console.log(\"change\", err, changes);\n      sidebar.draw();\n\n      var matches = window.location.toString().match(/^[^#]*#(.+)$/);\n      if (matches && matches[1] && !/edit/.test(matches[1])) {\n          route.go(matches[1])\n      }\n  });\n\n});\n\n\n//@ sourceURL=/www/js/app.js"
));
require("/www/js/app.js");
})();
