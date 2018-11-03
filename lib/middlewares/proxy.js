'use strict';

var proxy = require('http-proxy-middleware');

module.exports = function(app) {
  var config = this.config;
  var args = this.env.args || {};
  var proxyPath = args.P || args.proxyPath || config.server.proxyPath || process.env.proxy_path;
  var proxyUrl = args.U || args.proxyUrl || config.server.proxyUrl || process.env.proxy_url;

  if (!proxyPath || !proxyUrl) return;

  // In case of multiple proxy-url options, ignore all but last.
  if (Array.isArray(proxyUrl)) {
    proxyUrl = proxyUrl[proxyUrl.length - 1];
  }

  app.use(proxyPath, proxy({target: proxyUrl, changeOrigin: true}));
};
