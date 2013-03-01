var mu = require("mustache").render,
  auth = require("./auth"),
  config = require("./config");

module.exports = function(route) {
  // edit the front page of a wiki
  route("/edit/:id", function(e, params) {
    var newWiki;
    auth.getUser(function(no, user) {
      if (no) {
        route.go("/start");
      } else {
        newWiki = {
          _id : params.id == "_new" ? Math.random().toString(34).slice(2) : params.id,
          created_at : new Date(),
          members : user.user, // todo 'name'
          type : "wiki"
        };
        newWiki.wiki_id = newWiki._id;
        if (params.id == "_new") {
            console.log("_newWiki",newWiki);
            withWiki(false, newWiki);
        } else {
            console.log("get wiki");
            coux.get([config.dbUrl,params.id], withWiki);
        }
      }
    });
      function withWiki(err, wiki) {
          if (err) {
              console.log("withWiki", err)
              wiki = newWiki;
          }
          console.log("edit form");
          $('#content').html(mu(config.t['edit-wiki'], wiki));
          $('input.save').click(function() {
              $('#content form').submit();
          });
          $('#content form').submit(function(e) {
              e.preventDefault();
              wiki.title = $("[name=title]").val();
              wiki.markdown = $("textarea",this).val();
              wiki.tags = $("[name=tags]",this).val();
              wiki.members = $("[name=members]",this).val();
              wiki.updated_at = new Date();
              coux.put([config.dbUrl,wiki._id], wiki, function(err, ok) {
                  console.log("saved", err, ok);
                  if (!err) route.go("/wiki/"+wiki._id);
              });
          });
      }

  });


  function editNestedPage (page) {

  }
  // edit any other page of a wiki
  route("/edit/:id/:page", function(e, params) {
      currentWiki = params.id;
      coux.get([config.dbUrl,params.id], function(err, wiki) {
          if (!err) {
              coux.get([config.dbUrl,params.id+':'+params.page], function(err, page) {
                  if (err) {
                      page = {
                          _id : params.id+':'+params.page,
                          created_at : new Date(),
                          type : "page",
                          wiki_id : params.id
                      };
                  }
                  var data = {
                      markdown : page.markdown,
                      title : wiki.title,
                      wiki_id : params.id,
                      page_id : params.page
                  };
                  $('#content').html(mu(config.t['edit-page'], data));
                  $('input.save').click(function() {
                      $('#content form').submit();
                  });
                  $('#content form').submit(function(e) {
                      e.preventDefault();
                      page.markdown = $("textarea", this).val();
                      wiki.updated_at = page.updated_at = new Date();
                      coux.put([config.dbUrl,page._id], page, function(err, ok) {
                          console.log("saved", err, ok);
                          route.go("/wiki/"+wiki._id+"/"+params.page);
                          coux.put([config.dbUrl, wiki._id], wiki, function() {});
                      });
                  });

              });
          } else {
              route.go("/edit/"+currentWiki);
          }
      });
  });
};
