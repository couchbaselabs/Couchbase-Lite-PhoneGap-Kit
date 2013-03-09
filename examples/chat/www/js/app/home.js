var config = require('./config'),
  async = require("async");

exports.index = function() {
  // render index content html
  var elem = $(this);
  console.log(["config.email", config.email]);

  config.db.get(["_design","threads","_view","messages", {group_level : 1}], function(err, view) {
    var rows = view.rows.sort(function(a, b){ return new Date(a.value[0]) - new Date(b.value[0])});
    console.log(["rows", rows]);
    async.map(rows, function(row, cb) {
      config.db.get(row.key[0], function(err, doc){
        row.doc = doc;
        cb(err, row);
      });
    }, function(err, results){
      console.log(["results", results]);
      elem.html(config.t.index({user: config.email, rows : results}))
    });

    // return;

    // view.rows.forEach(function(row, i){
    //   row.path = "/thread/"+row.id;
    // });


    // elem.find(".new").click(function(){
    //   location.hash = "/threads/new";
    // });
    // elem.find('li a').click(function() {
    //   elem.find('ul li').removeClass("active");
    //   $(this).parents("li").addClass("active");
    // });
  });
}
