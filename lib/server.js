var connect = require('connect');
var http = require('http');
var Promise = require('bluebird');
var chalk = require('chalk');

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

  return Promise.all([
    // Load middlewares
    this.extend.filter.exec('server_middleware', app, {context: this}),
    // Load source files
    this.post.load({watch: true})
  ]).then(function(){
    var server = http.createServer(app).listen(port, ip, function(){
      self.log.info('Hexo is running at ' + chalk.underline('http://%s:%d%s') + '. Press Ctrl+C to stop.', ip, port, root);
      self.emit('server');
    });

    server.on('error', function(err){
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
  });
}

module.exports = server;