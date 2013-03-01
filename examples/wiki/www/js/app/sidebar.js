var config = require("./config"),
  mu = require("mustache").render;

module.exports = function(route) {
  return {
    draw : function(cb) {
      coux.get([config.dbUrl,"_design","wiki","_view","title",
        {reduce:false, descending:true, limit:100}], function(err, view) {
          if (err) throw(err);
          view.rows.forEach(function(row) {
            row.path = '#/wiki/'+row.id;
          });
          console.log(view.rows)
          var st = mu(config.t.sidebar, view);
          $('#sidebar').html(st);
          $("#sidebar input.new").click(function() {
            route.go("#/edit/_new");
          })
          if (cb) {
            cb(err, view);
          }
      });
    }
  }
};
