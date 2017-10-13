'use strict';

var connect = require('connect');
var http = require('http');
var chalk = require('chalk');
var Promise = require('bluebird');
var format = require('util').format;
var open = require('opn');
var net = require('net');
var url = require('url');

module.exports = function(args) {

  var app = connect();
  var config = this.config;
  var root = config.root;
  var self = this;


  var address = new url(args.a || args.address || config.server.address || 'http://localhost:4000');

  serverinit = {};
  serverinit["http:"] = function () {

    return new Promise( resolve, reject => {

      server = http.createServer(app);

      server.once("error", error => { reject(error); });

      server.listen({ port: address.port, host: address.hostname }, address => { resolve(address); });

    });

  }

  // serverinit["https:"] = function () {}

  serverinit["file:"] = function () {
    return new Promise( resolve, reject => {

      server = http.createServer(app);

      server.once("error", error => { reject(error); });

      server.listen({ path: address.path }, address => { resolve(address); });

    });
  }

  if (address.protocol && typeof(serverinit[address.protocol]) == 'function') {

    self.extend.filter.exec('server_middleware', app, {context: self});

    if (args.s || args.static) {
      return self.load();
    }

    self.watch();

    serverinit[address.protocol]()
    .then(
      address => {
        self.log.info('Hexo is running at %s. Press Ctrl+C to stop.', chalk.underline(address));
      }
    )
    .catch(
      error => {
        elf.log.fatal(`Could not start server by following error \n\n ${error.stack}`);
      }
    )

  } else {
    elf.log.fatal(`Invalid URL scheme (${address.protocol}) or protocol not supported.`);
  }
}
