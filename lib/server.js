'use strict';

const connect = require('connect');
const http = require('http');
const chalk = require('chalk');
const Promise = require('bluebird');
const open = require('opn');
const net = require('net');
const url = require('url');

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

    this.log.info('Hexo is running at %s . Press Ctrl+C to stop.', chalk.underline(addrString));
    this.emit('server');

    if (args.o || args.open) {
      open(addrString);
    }

    return server;
  }).catch(err => {
    switch (err.code) {
      case 'EADDRINUSE':
        this.log.fatal('Port %d has been used. Try other port instead.', port);
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
    server.listen(port, ip, () => {
      resolve(server);
    });

    server.on('error', reject);
  });
}

function checkPort(ip, port) {
  return new Promise((resolve, reject) => {
    if (port > 65535 || port < 1) {
      return reject(new Error(`Port number ${port} is invalid. Try a number between 1 and 65535.`));
    }

    const server = net.createServer();

    server.once('error', reject);

    server.once('listening', () => {
      server.close();
      resolve();
    });

    server.listen(port, ip);
  });
}

function formatAddress(ip, port, root) {
  let hostname = ip;
  if (ip === '0.0.0.0' || ip === '::') {
    hostname = 'localhost';
  }

  return url.format({protocol: 'http', hostname: hostname, port: port, path: root});
}
