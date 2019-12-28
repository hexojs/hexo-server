'use strict';

const { getType } = require('mime');

module.exports = function(app) {
  const { config, route } = this;
  const { root } = config;

  if (!config.server.preCompressed) return;

  app.use(root, (req, res, next) => {
    const { headers, method } = req;
    const url = decodeURIComponent(req.url);
    const acceptEncoding = headers['accept-encoding'] || '';
    const reqUrl = url.endsWith('/') ? url.concat('index.html') : url;
    const contentType = getType(reqUrl);
    const vary = res.getHeader('Vary');

    if (method !== 'GET' && method !== 'HEAD') return next();

    res.setHeader('Content-Type', contentType + '; charset=utf-8');

    if (acceptEncoding.includes('br') && (route.get(url.slice(1) + '.br') || url.endsWith('/'))) {
      req.url = encodeURI(reqUrl + '.br');
      res.setHeader('Content-Encoding', 'br');
    } else if (acceptEncoding.includes('gzip') && (route.get(url.slice(1) + '.gz') || url.endsWith('/'))) {
      req.url = encodeURI(reqUrl + '.gz');
      res.setHeader('Content-Encoding', 'gzip');
    }

    if (!vary) {
      res.setHeader('Vary', 'Accept-Encoding');
    } else if (!vary.includes('Accept-Encoding')) {
      res.setHeader('Vary', vary + ', Accept-Encoding');
    }

    return next();
  });
};
