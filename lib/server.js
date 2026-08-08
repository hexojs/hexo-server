'use strict';

const connect = require('connect');
const http = require('http');
const { underline, bold } = require('picocolors');
const Promise = require('bluebird');
const open = require('open');
const net = require('net');

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
    const listeningAddress = getListeningAddress(server.address());
    this.log.info('hexo-server listening on %s . Press Ctrl+C to stop.', bold(listeningAddress));

    return server;
  }).then(server => {
    const addr = server.address();
    const localAddress = getLocalAddress(ip || addr.address, addr.port, root);

    this.log.info('Preview your site via: %s ', underline(localAddress));
    this.emit('server');

    if (args.o || args.open) {
      open(localAddress);
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

function startServer(server, port, ip) {
  return new Promise((resolve, reject) => {
    server.listen(port, ip, resolve);
    server.on('error', reject);
  }).then(() => server);
}

function checkPort(ip, port) {
  if (port > 65535 || port < 1) {
    return Promise.reject(new RangeError(`Port number ${port} is invalid. Try a number between 1 and 65535.`));
  }

  const server = net.createServer();

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.once('listening', resolve);
    server.listen(port, ip);
  }).then(() => { server.close(); });
}

function getListeningAddress(serverAddress) {
  const {address, port, family} = serverAddress;
  let host;
  if (family === 'IPv6') {
    host = `[${address}]`;
  } else {
    host = address;
  }
  return `${host}:${port}`;
}

function getLocalAddress(ip, port, root) {
  let hostname = ip;
  if (ip === '0.0.0.0' || ip === '::') {
    hostname = 'localhost';
  }

  if (hostname.includes(':')) {
    hostname = `[${hostname}]`;
  }

  const path = root.startsWith('/') ? root : `/${root}`;
  return new URL(`http://${hostname}:${port}${path}`).toString();
}
