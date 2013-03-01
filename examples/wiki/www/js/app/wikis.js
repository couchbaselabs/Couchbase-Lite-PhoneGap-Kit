var mu = require("mustache").render,
  wikiToHtml = require("./wikiwords").wikiToHtml,

  // wikiToHtml = require("./sync").wikiToHtml,
  config = require("./config");


// module?



module.exports = function(route) {

  function drawPage(wiki, page, cb) {
      currentWiki = wiki._id;
      var data = {
          body : wikiToHtml((page || wiki).markdown),
          tags : wiki.tags,
          title : wiki.title,
          members : wiki.members,
          wiki_id : currentWiki,
          page_id : (page ? page._id.split(':').pop() : null)
      };
      var st = mu(config.t.wiki, data);
      $('#content').html(st);
      $('input.save').click(function() {
          var path = wiki._id;
          if (page) path += "/"+data.page_id;
          route.go("/edit/"+path);
      })
      if (cb) {cb()};
  };
  // read the front page of wiki
  route("/wiki/:id", function(e, params) {

      currentWiki = params.id;
      coux.get([config.dbUrl,params.id], function(err, doc) {
          if (err) {
              console.log("error", err);
              return;
          }
          drawPage(doc, null)
      });
  });

  // read any other page of a wiki
  route("/wiki/:id/:page", function(e, params) {

      currentWiki = params.id;
      coux.get([config.dbUrl,params.id], function(err, wiki) {
          if (!err) {
              coux.get([config.dbUrl,params.id+':'+params.page], function(err, page) {
                  if (!err) {
                      drawPage(wiki, page);
                  } else {
                      route.go("/edit/"+currentWiki+'/'+params.page);
                  }
              });
          } else {
              route.go("/edit/"+currentWiki);
          }
      });
  });
};
