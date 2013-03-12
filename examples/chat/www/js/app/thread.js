var config = require("./config"),
  db = config.db,
  messagesView = db(["_design","threads","_view","messages"]),
  jsonform = require("./jsonform");

function getMessagesView(id, cb) {
  messagesView([{descending:true, reduce: false,
      startkey : [id,{}], endkey : [id]}], cb);
}

function makeNewPhotoClick(user) {
    return function(e) {
      e.preventDefault();
      if (!(navigator.camera && navigator.camera.getPicture)) {
        console.error("no navigator.camera.getPicture")
      } else {
        var link = this, form = $(link).parent("form"),
          doc = messageFromForm(user.user, form);
        if (!doc._rev) delete doc._rev;
        if (!doc._id) delete doc._id;
        console.log("doc!", doc)
        db.post(doc, function(err, ok) {
          navigator.camera.getPicture(function(picData){
            doc._id = ok.id;
            doc._rev = ok.rev;
            doc._attachments = {
              "photo.jpg" : {
                content_type : "image/jpg",
                data : picData
              }
            };
            console.log("save photo", doc._id)
            db.put(doc._id, doc, function(err, ok){
              if (err) {return console.log("save err",err);}
              console.log("pic",ok)
              var input = $("form.message [name=text]");
              if (input.val() == doc.text) {
                input.val('');
              }
            });
          }, function(err){console.error("camera err",err)}, {
            quality : 25,
            targetWidth : 1024,
            targetHeight : 1024,
            destinationType: Camera.DestinationType.DATA_URL
          });
        });
      }
    }
};

function messageFromForm(author, form) {
  var doc = jsonform(form);
  doc.author = author; // todo rename
  doc.created_at = doc.updated_at = new Date();
  // doc.seq = last_seq++;
  doc.type = "chat";
  return doc;
};

function makeNewMessageSubmit(email) {
  return function(e) {
  e.preventDefault();
  var form = this, doc = messageFromForm(email, form);
  // emit([doc.channel_id, doc.seq, doc.updated_at], doc.markdown);
  if (!doc._rev) delete doc._rev;
  if (!doc._id) delete doc._id;

  console.log("makeNewMessageSubmit", doc, $(form).find("[name=_id]").val());
  db.post(doc, function(err, ok){
    if (err) {
      $(form).find("[name=_id]").val('');
      $(form).find("[name=_rev]").val('');
      return console.log(err);
    }
    var input = $(form).find("[name=text]");
    if (input.val() == doc.markdown) {
      input.val('');
    }
    $(form).find("[name=_id]").val('');
    $(form).find("[name=_rev]").val('');
  });
}
}

function listMessages (elem, room_id) {
  getMessagesView(room_id, function(err, view) {
    if(err){return location.hash="/error";}
    var rows = view.rows;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].value[0] == config.email) {
        rows[i].who = "mine";
      }
    };
    elem.html(config.t.listMessages(view));
  });
}

exports.view = function(params) {
  var elem = $(this);
  db.get(params.id, function(err, thread) {
    if(err){return location.hash="/error";}
    elem.html(config.t.room(thread));
    elem.find("form").submit(makeNewMessageSubmit(config.email));
    listMessages(elem.find(".messages"), thread._id);
  });
  return;
  elem.find("a.photo").click(makeNewPhotoClick(user));
};

exports.create = function(params) {
  console.log("new thread", this, params)
  var elem = $(this);

  auth.getUser(function(err, user) {
    if (err) {
      location.hash = "/reload";
      return;
    };
    elem.html(config.t.newThread(user));
    elem.find("form").submit(function(e) {
      e.preventDefault();
      var doc = jsonform(this);
      doc.owner_id = user.user; // todo rename
      doc.created_at = doc.updated_at = new Date();
      doc._id = doc.thread_id = Math.random().toString(20).slice(2);
      doc.type = "thread";
      db.post(doc, function(err, ok) {
        console.log(err, ok);
        location.hash = "/thread/"+ok.id;
      });
      return false;
    });
  });
};
