'use strict';

var connect = require('connect');
var http = require('http');
var chalk = require('chalk');
var Promise = require('bluebird');
var format = require('util').format;
var open = require('opn');
var os = require('os');
var url = require('url');
var net = require('net');

module.exports = function(args) {
  var app = connect();
  var config = this.config;
  var ip = args.i || args.ip || config.server.ip || 'localhost';
  var port = parseInt(args.p || args.port || config.server.port || process.env.port, 10) || 4000;
  var root = config.root;
  var self = this;

  return checkPort(ip, port).then(function() {
    return self.extend.filter.exec('server_middleware', app, {context: self});
  }).then(function() {
    if (args.s || args.static) {
      return self.load();
    }

    return self.watch();
  }).then(function() {
    return startServer(http.createServer(app), port, ip);
  }).then(function(server) {
    var addr = '';
    if (ip === '0.0.0.0') {
      // '0.0.0.0' is not addressable and needs special handling
      // see discussion at https://github.com/hexojs/hexo-server/pull/14
      addr = format('http://%s:%d%s', '127.0.0.1', port, root);
      var addrAlt = url.format({protocol: 'http', hostname: os.hostname(), port: port });
      self.log.info('hexo-server is listening for *all* network interfaces on the machine.');
      self.log.info('You can visit the site at any reachable IP, such as:\n        %s or %s.',
        chalk.underline(addr), chalk.underline(addrAlt));
      self.log.info('Press Ctrl+C to stop.');
    }
    else {
      addr = format('http://%s:%d%s', ip, port, root);
      self.log.info('hexo-server has started.');
      self.log.info('You can visit the site at %s.', chalk.underline(addr));
      self.log.info('Press Ctrl+C to stop.');
    }
    self.emit('server');

    if (args.o || args.open) {
      open(addr);
    }

    return server;
  }).catch(function(err) {
    switch (err.code){
      case 'EADDRINUSE':
        self.log.fatal('Port %d has been used. Try other port instead.', port);
        break;

      case 'EACCES':
        self.log.fatal('Permission denied. You can\'t use port ' + port + '.');
        break;
    }

    self.unwatch();
    throw err;
  });
};

function startServer(server, port, ip) {
  return new Promise(function(resolve, reject) {
    server.listen(port, ip, function() {
      resolve(server);
    });

    server.on('error', reject);
  });
}

function checkPort(ip, port) {
  return new Promise(function(resolve, reject) {
    if (port > 65535 || port < 1) {
      return reject(new Error('Port number ' + port + ' is invalid. Try a number between 1 and 65535.'));
    }

    var server = net.createServer();

    server.once('error', reject);

    server.once('listening', function() {
      server.close();
      resolve();
    });

    server.listen(port, ip);
  });
}
