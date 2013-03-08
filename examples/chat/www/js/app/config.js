var config = module.exports = {
    t : {}, dbName : "mydb",
    dbHost : 'http://lite.couchbase.'
  },
  mu = require("mustache"),
  coax = require("coax");

// todo make configurable in-app
config.syncOrigin = 'http://animal.local:4984/';
config.syncTarget = 'http://animal.local:4984/sync_gateway';

config.dbUrl = config.dbHost + '/' + config.dbName;

config.db = coax(config.dbUrl);
config.dbServer = coax(config.dbHost);

$('script[type="text/mustache"]').each(function() {
    var id = this.id.split('-');
    id.pop();
    module.exports.t[id.join('-')] = mu.compile(this.innerHTML.replace(/^\s+|\s+$/g,''));
});

var ddoc = {
  _id : "_design/threads",
  views : {
    messages : {
      map : function(doc) {
        var val = {text:doc.text, author:doc.author_id};
        if (doc._attachments && doc._attachments['photo.jpg']) {
          val.photo = "photo.jpg";
        }
        if (doc.thread_id && doc.updated_at && doc.author_id) {
          emit([doc.thread_id, doc.seq, doc.updated_at], val);
        }
      }.toString()
    },
    updated : {
      map : function(doc) {
        if (doc.members && doc.updated_at) {
          emit(doc.updated_at, doc.members);
        }
      }.toString()
    }
  }
}

config.setup = function(done) {
  // install the views
  config.db.forceSave(ddoc, done);
}
