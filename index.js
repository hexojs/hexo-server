/* global hexo */

'use strict';

hexo.config.server = Object.assign({
  port: 4000,
  log: false,
  // `undefined` uses Node's default (try `::` with fallback to `0.0.0.0`)
  ip: undefined,
  compress: false,
  header: true
}, hexo.config.server);

hexo.extend.console.register('server', 'Start the server.', {
  desc: 'Start the server and watch for file changes.',
  options: [
    {name: '-i, --ip', desc: 'Override the default server IP. Bind to all IP address by default.'},
    {name: '-p, --port', desc: 'Override the default port.'},
    {name: '-s, --static', desc: 'Only serve static files.'},
    {name: '-l, --log [format]', desc: 'Enable logger. Override log format.'},
    {name: '-o, --open', desc: 'Immediately open the server url in your default web browser.'},
    {name: '-P, --proxy-path', desc: 'Proxy this path.'},
    {name: '-U, --proxy-url', desc: 'Proxy the path specified with -P to this URL.'}
  ]
}, require('./lib/server'));

hexo.extend.filter.register('server_middleware', require('./lib/middlewares/header'));
hexo.extend.filter.register('server_middleware', require('./lib/middlewares/gzip'));
hexo.extend.filter.register('server_middleware', require('./lib/middlewares/logger'));
hexo.extend.filter.register('server_middleware', require('./lib/middlewares/route'));
hexo.extend.filter.register('server_middleware', require('./lib/middlewares/static'));
hexo.extend.filter.register('server_middleware', require('./lib/middlewares/redirect'));
hexo.extend.filter.register('server_middleware', require('./lib/middlewares/proxy'));
