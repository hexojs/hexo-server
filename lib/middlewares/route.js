var pathFn = require('path');
var Readable = require('stream').Readable;
var util = require('../util');

module.exports = function(app){
  var config = this.config;
  var args = this.env.args || {};
  var root = config.root;
  var route = this.route;

  if (args.s || args.static) return;

  app.use(root, function(req, res, next){
    var method = req.method;
    if (method !== 'GET' && method !== 'HEAD') return next();

    var url = route.format(decodeURIComponent(req.url));
    var data = route.get(url);

    // When the URL is `foo/index.html` but users access `foo`, redirect to `foo/`.
    if (!target){
      if (pathFn.extname(url)) return next();

      return util.redirect(res, root + url + '/');
    }

    data.pipe(res).on('error', next);
  });
};