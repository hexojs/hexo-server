'use strict';

const pathFn = require('path');
const mime = require('mime');

module.exports = function(app) {
  const { config, route } = this;
  const { args = {} } = this.env;
  const { root } = config;

  if (args.s || args.static) return;

  app.use(root, (req, res, next) => {
    const { method } = req;
    if (method !== 'GET' && method !== 'HEAD') return next();

    let url = route.format(decodeURIComponent(req.url));
    let data = route.get(url);
    let extname = pathFn.extname(url);

    if (!data) {
      if (route.get(url + '/index.html')) {
        // When the URL is `foo/index.html` but users access `foo`, redirect to `foo/`.
        url = encodeURI(url);
        res.statusCode = 302;
        res.setHeader('Location', `${root + url}/`);
        res.end('Redirecting');
        return;
      } else if (route.get(url + '.html')) {
        // When the URL is `foo/bar.html` but users access `foo/bar`, proxy to the URL.
        extname = '.html';
        data = route.get(url + extname);
        res.setHeader('Content-Type', 'text/html');
        req.url = encodeURI('/' + url + extname);
        data.pipe(res).on('error', next);
        return;
      } return next();
    }

    res.setHeader('Content-Type', extname ? mime.getType(extname) : 'application/octet-stream');

    if (method === 'GET') {
      data.pipe(res).on('error', next);
    } else {
      res.end();
    }
  });
};
