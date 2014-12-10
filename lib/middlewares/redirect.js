var util = require('../util');

module.exports = function(app){
  var root = this.config.root;
  if (root === '/') return;

  // If root url is not `/`, redirect to the correct root url
  app.use(function(req, res, next){
    if (req.method !== 'GET' || req.url !== '/') return next();

    util.redirect(res, root);
  });
};