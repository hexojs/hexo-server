'use strict';

const { getType } = require('mime');

module.exports = function(app) {
  const { config, route } = this;
  const { root } = config;
  const { pretty_urls } = config;
  const { trailing_index, trailing_html } = pretty_urls ? pretty_urls : {};

  if (!config.server.pre_compressed) return;

  app.use(root, (req, res, next) => {
    const { headers, method, url: requestUrl } = req;
    const acceptEncoding = headers['accept-encoding'] || '';
    const vary = res.getHeader('Vary');
    const url = route.format(decodeURIComponent(requestUrl));
    const data = route.get(url);

    if (method !== 'GET' && method !== 'HEAD') return next();

    const preFn = (acceptEncoding, url, req, res) => {
      res.setHeader('Content-Type', getType(url) + '; charset=utf-8');

      if (acceptEncoding.includes('br') && route.get(url + '.br')) {
        req.url = encodeURI('/' + url + '.br');
        res.setHeader('Content-Encoding', 'br');
      } else if (acceptEncoding.includes('gzip') && route.get(url + '.gz')) {
        req.url = encodeURI('/' + url + '.gz');
        res.setHeader('Content-Encoding', 'gzip');
      }
    };

    if (data) {
      if ((trailing_html === false && !requestUrl.endsWith('/index.html') && requestUrl.endsWith('.html')) || (trailing_index === false && requestUrl.endsWith('/index.html'))) {
        // location `foo/bar.html`; request `foo/bar.html`; redirect to `foo/bar`
        // location `foo/index.html`; request `foo/index.html`; redirect to `foo/`
        return next();
      }
      // location `foo/bar/index.html`; request `foo/bar/` or `foo/bar/index.html; proxy to the location
      // also applies to non-html
      preFn(acceptEncoding, url, req, res);
    } else {
      if (route.get(url + '.html')) {
        // location `foo/bar.html`; request `foo/bar`; proxy to the `foo/bar.html.br`
        preFn(acceptEncoding, url + '.html', req, res);
      } else {
        return next();
      }
    }

    if (!vary) {
      res.setHeader('Vary', 'Accept-Encoding');
    } else if (!vary.includes('Accept-Encoding')) {
      res.setHeader('Vary', vary + ', Accept-Encoding');
    }

    return next();
  });
};
