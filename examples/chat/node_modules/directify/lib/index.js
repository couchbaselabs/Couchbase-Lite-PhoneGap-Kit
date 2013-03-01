var director = require('./include/director'),
    Router = director.Router,
    routerHelper = require('./helpers');

var router = null;

module.exports = function(routingTable, target) {
  if (router) return router;
  
  if (!routingTable) throw new Error('No routing table provided. =(');

  router = new Router();
  
  router.target = target;
  router.updateParams = routerHelper.updateParams;
  router.ensureParams = routerHelper.ensureParams;
  router.param('json', routerHelper.jsonRegex);
  
  router.configure({
    before: [routerHelper.setPath, routerHelper.setParams]
  });
  
  router.mount(routingTable);
  
  var dispatchCopy = router.dispatch;
  router.dispatch = function(method, fragment) {
    return dispatchCopy.call(this, method, unescape(fragment));
  };
  
  router.init();
  
  return router;
};
