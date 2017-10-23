'use strict';

var pathFn = require('path');
var mime = require('mime');

module.exports = function (app) {
  var config = this.config;
  var args = this.env.args || {};
  var root = config.root;
  var route = this.route;
  var _this = this;

  if (args.s || args.static) return;

  app.use(root, function (req, res, next) {
    var method = req.method;
    if (method !== 'GET' && method !== 'HEAD') return next();

    var url = route.format(decodeURIComponent(req.url));
    var data = route.get(url);
    var extname = pathFn.extname(url);

    // When the URL is `foo/index.html` but users access `foo`, redirect to `foo/`.
    if (!data) {
      if (extname) return next();

      var redirectTarget = '';
      var pagePaths = _this.locals.get('pages').map(function (item) {
        return item.path;
      });

      // When the URL is `foo/some-page.html` but users access `foo/some-page`, redirect to `foo/some-page.html`.
      for (var i = 0; i < pagePaths.length; i++) {
        if (new RegExp('^/?' + pagePaths[i] + '$', 'i').test(url + '.html')) {
          redirectTarget = root + pagePaths[i];
          break;
        }
      }
      // When the URL is `foo/index.html` but users access `foo`, redirect to `foo/`.
      if (redirectTarget.length <= 0) {
        url = encodeURI(url);
        redirectTarget = root + url + '/';
      }

      res.statusCode = 302;
      res.setHeader('Location', redirectTarget);
      res.end('Redirecting');
      return;
    }

    res.setHeader('Content-Type', extname ? mime.lookup(extname) : 'application/octet-stream');

    if (method === 'GET') {
      data.pipe(res).on('error', next);
    } else {
      res.end();
    }
  });
};