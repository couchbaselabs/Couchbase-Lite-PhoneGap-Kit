var auth = require("./auth"),
  config = require("./config"),
  db = config.db,
  messagesView = db(["_design","threads","_view","messages"]),
  jsonform = require("./jsonform");

var last_seq = 0;
function getMessagesView(id, cb) {
  // console.log(["getMessagesView", id])
  messagesView([{descending:true,
      startkey : [id,{}], endkey : [id]}], function(err, view) {
    if (!err && view.rows[0]) {
      last_seq = view.rows[0].key[1];
    }
    // console.log(["view", view])
    if (!err) {
      view.rows.forEach(function(r) {
        if (r.value.photo) {
          r.value.path = config.dbUrl+'/'+r.id+"/photo.jpg";
        }
      })
    }
    cb(err, view)
  });
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

function messageFromForm(author_id, form) {
  var doc = jsonform(form);
  doc.author_id = author_id; // todo rename
  doc.created_at = doc.updated_at = new Date();
  doc.thread_id = $("section.thread ul").attr("data-thread_id");
  doc.seq = last_seq++;
  doc.type = "message";
  return doc;
};

function makeMessageBlur(user) {
  return function(e) {
    e.preventDefault();
    var form = this,
      doc = messageFromForm(user.user, form),
      rev = $(form).find("[name=_rev]").val(),
      id = $(form).find("[name=_id]").val();
    console.log("blur", id, rev, doc);
    if (id && rev) {
      db.del([id, {rev : rev}], function(err, ok){
        console.log("blur cleaned")
      });
    }
  }
}

function makeNewMessageBubbles(user) { // todo put author id in the dom
  console.log("makeNewMessageBubbles make", user.user);
return function(e) {
  e.preventDefault();
  var form = this, doc = messageFromForm(user.user, form);
  console.log("NewMessageBubbles", doc, $(form).find("[name=_id]").val())
  if (!$(form).find("[name=_id]").val()) {
    console.log("makeNewMessageBubbles post");
    delete doc._id;
    delete doc._rev;
    if (!doc.text) delete doc.text;
    db.post(doc, function(err, ok){
      if (err) {return console.log(err);}
      console.log("made bubble", ok.id, ok.rev);
      $(form).find("[name=_id]").val(ok.id);
      $(form).find("[name=_rev]").val(ok.rev);
    });
  }

};
}

function makeNewMessageSubmit(user) {
  return function(e) {
  e.preventDefault();
  var form = this, doc = messageFromForm(user.user, form);
  // emit([doc.thread_id, doc.seq, doc.updated_at], doc.text);
  if (!doc._rev) delete doc._rev;
  if (!doc._id) delete doc._id;

  console.log("makeNewMessageSubmit", doc, $(form).find("[name=_id]").val());
  db.post(doc, function(err, ok){
    if (err) {
      $(form).find("[name=_id]").val('');
      $(form).find("[name=_rev]").val('');
      return console.log(err);
    }
    console.log("makeNewMessageSubmit put",ok);
    var input = $(form).find("[name=text]");
    if (input.val() == doc.text) {
      input.val('');
    }
    $(form).find("[name=_id]").val('');
    $(form).find("[name=_rev]").val('');
    console.log("makeNewMessageSubmit cleared",form);
  });
}
}

exports.view = function(params) {
  var elem = $(this);
  auth.getUser(function(err, user) {
    if (err) {
      location.hash = "/reload";
      return;
    };
    // if we aren't in thread mode, go there
    if (!elem.find('form.message')[0]) {
      elem.html(config.t.threadMode());
      elem.find("form").submit(makeNewMessageSubmit(user));
      // elem.find("form input").on("focus", makeNewMessageBubbles(user));
      // elem.find("form input").on("focus", function(e){
      //   var bbls = makeNewMessageBubbles(user);
      //   bbls.call(elem.find("form"), e)
      // });
      // elem.find("form input").on("blur", function(e){
      //   var bbls = makeMessageBlur(user);
      //   bbls.call(elem.find("form"), e)
      // });
      console.log("bind to photo link")
      elem.find("a.photo").click(makeNewPhotoClick(user));
    }

    db.get(params.id, function(err, thread) {
      if(err){return location.hash="/error";}
      getMessagesView(thread._id, function(err, view) {
        if(err){return location.hash="/reload";}
        thread.rows = view.rows;
        // console.log(view.rows)
        $("section.thread").html(config.t.listMessages(thread));
      });
    });
  });
};

function drawSidebar(elem, active) {
  db.get(["_design","threads","_view","updated"], function(err, view) {
    var activeOffset;
    view.rows.forEach(function(row, i){
      if (active && active._id == row.id) {
        row.active = active;
        activeOffset = i;
      }
      row.path = "/thread/"+row.id;
    });
    elem.html(config.t.threadsSidebar(view))
    elem.find(".new").click(function(){
      location.hash = "/threads/new";
    });
    elem.find('li a').click(function() {
      elem.find('ul li').removeClass("active");
      $(this).parents("li").addClass("active");
    });
  });
}

// sidebar
exports.index = function(params) {
  var elem = $(this);
  if (params.id) {
    db(params.id, function(err, doc){
      drawSidebar(elem, doc)
    });
  } else {
    drawSidebar(elem)
  }
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
