var config = module.exports = {t : {}};

config.dbHost = 'http://localhost.touchdb.';

config.sync = 'http://animal.local:3000/channels/';

config.syncTarget = 'animal.local:4984/basecouch';

if (location.protocol != "file:") {
  config.dbHost = location.origin;
}

config.dbUrl = config.dbHost + '/wiki';

$('script[type="text/mustache"]').each(function() {
    var id = this.id.split('-');
    id.pop();
    module.exports.t[id.join('-')] = $(this).html();
});
