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
    {name: '-c, --cert [path]', desc: 'SSL certificate path.'},
    {name: '-ck, --key [path]', desc: 'SSL private certificate path.'},
    {name: '-h, --ssl', desc: 'Enable SSL localhost. If --cert and --key is present, ssl will enabled automatically. If --cert and --key is not present, but --ssl is preset, default certificate will be applied.'}
  ]
}, require('./server'));

hexo.extend.filter.register('server_middleware', require('./middlewares/header'));
hexo.extend.filter.register('server_middleware', require('./middlewares/gzip'));
hexo.extend.filter.register('server_middleware', require('./middlewares/logger'));
hexo.extend.filter.register('server_middleware', require('./middlewares/route'));
hexo.extend.filter.register('server_middleware', require('./middlewares/static'));
hexo.extend.filter.register('server_middleware', require('./middlewares/redirect'));
