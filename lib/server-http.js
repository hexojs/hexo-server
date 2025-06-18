'use strict';

const connect = require('connect');
const http = require('http');
const { underline } = require('picocolors');
const open = require('open');
const { checkPort, startServer, formatAddress } = require('./server-utils');

/**
 * Starts a local HTTP server for Hexo with optional live reload or static serving.
 *
 * @this {import('hexo')}
 * @param {Object} args - The CLI arguments.
 * @param {string} [args.i] - IP address to bind.
 * @param {string} [args.ip] - Alternative IP address to bind.
 * @param {string|number} [args.p] - Port number to use.
 * @param {string|number} [args.port] - Alternative port number.
 * @param {boolean} [args.s] - Serve static files only.
 * @param {boolean} [args.static] - Alternative flag to serve static files only.
 * @param {boolean} [args.o] - Open the site automatically in a browser.
 * @param {boolean} [args.open] - Alternative flag to open the site automatically.
 * @returns {Promise<import('net').Server>} The created HTTP server.
 */
module.exports = function(args) {
  const app = connect();
  const { config } = this;
  const ip = args.i || args.ip || config.server.ip || undefined;
  const port = parseInt(args.p || args.port || config.server.port || process.env.port, 10) || 4000;
  const { root } = config;

  return checkPort(ip, port).then(() => this.extend.filter.exec('server_middleware', app, {context: this})).then(() => {
    if (args.s || args.static) {
      return this.load();
    }

    return this.watch();
  }).then(() => startServer(http.createServer(app), port, ip)).then(server => {
    const addr = server.address();
    const addrString = formatAddress(ip || addr.address, addr.port, root);

    this.log.info('Hexo is running at %s . Press Ctrl+C to stop.', underline(addrString));
    this.emit('server');

    if (args.o || args.open) {
      open(addrString);
    }

    return server;
  }).catch(err => {
    switch (err.code) {
      case 'EADDRINUSE':
        this.log.fatal(`Port ${port} has been used. Try other port instead.`);
        break;

      case 'EACCES':
        this.log.fatal(`Permission denied. You can't use port ${port}.`);
        break;
    }

    this.unwatch();
    throw err;
  });
};
