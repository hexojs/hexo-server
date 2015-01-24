var connect = require('connect');
var http = require('http');
var chalk = require('chalk');
var Promise = require('bluebird');
var format = require('util').format;
var open = require('open');

function server(args){
  var app = connect();
  var config = this.config;
  var ip = args.i || args.ip || config.server.ip || 'localhost';
  var port = parseInt(args.p || args.port || config.server.port, 10) || 4000;
  var root = config.root;
  var self = this;

  if (port > 65535 || port < 1){
    throw new Error('Port number ' + port + ' is invalid. Try a number between 1 and 65535.');
  }

  return this.extend.filter.exec('server_middleware', app, {context: this}).then(function(){
    if (args.$test_mode){
      return self.load();
    } else {
      return self.watch();
    }
  }).then(function(){
    return startServer(http.createServer(app), port, ip);
  }).then(function(server){
    var addr = format('http://%s:%d%s', ip, port, root);
    self.log.info('Hexo is running at %s. Press Ctrl+C to stop.', chalk.underline(addr));
    self.emit('server');

    if (args.o || args.open) {
      open(addr);
    }

    return server;
  }, function(err){
    switch (err.code){
      case 'EADDRINUSE':
        self.log.fatal('Port %d has been used. Try other port instead.', port);
        break;

      case 'EACCES':
        self.log.fatal('Permission denied. You can\'t use port ' + port + '.');
        break;
    }

    throw err;
  });
}

function startServer(server, port, ip){
  return new Promise(function(resolve, reject){
    server.listen(port, ip, function(){
      resolve(server);
    });

    server.on('error', reject);
  });
}

module.exports = server;
