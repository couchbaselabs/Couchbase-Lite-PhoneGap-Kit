$(function() {
  var cbLiteServerURL = "http://lite.couchbase./";
  $.ajax({
    url:cbLiteServerURL,
    success : function(data) {
      $("#info").append('<p>Couchbase Lite version '+data.version+'</p>');
      $.ajax({
        url:cbLiteServerURL+"mydb",
        success : function(info) {
          console.log(info)
          $("#info").append('<p>Your database is available at <a href="'+cbLiteServerURL+'mydb">'+cbLiteServerURL+'mydb</a> - it was created in AppDelegate.m</p>');
        },
        error : function(){
          $("#info").append('<p>No database created, you can create one with a PUT to <a href="'+cbLiteServerURL+'mydb">'+cbLiteServerURL+'mydb</a></p>');
        }
      });
    },
    error : function(err) {
      $("#info").append('<p>Error accessing Couchbase Lite on <a href="'+cbLiteServerURL+'">'+cbLiteServerURL+'</a> -- maybe you need to whitelist this hostname (or "*") in your Resources/Cordava.plist ExternalHosts entry.</p>');
    }
 });
  $("a").live("click",function(e){
               e.preventDefault()
               console.log("click", this.href)

              ChildBrowser.showWebPage(this.href)
              console.log("clack")
              return false;
  });
});


