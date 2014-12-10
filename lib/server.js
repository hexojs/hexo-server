var connect = require('connect');
var http = require('http');
var Promise = require('bluebird');

require('colors');

function server(args){
  var app = connect();
  var config = hexo.config;
  var ip = args.i || args.ip || config.server_ip || 'localhost';
  var port = parseInt(args.p || args.port || config.port, 10) || 4000;
  var root = config.root;

  if (port > 65535 || port < 1){
    throw new Error('Port number ' + port + ' is invalid. Try a number between 1 and 65535.');
  }

  return Promise.all([
    // Load middlewares
    hexo.extend.filter.exec('server_middleware', app, {context: hexo}),
    // Load source files
    hexo.post.load({watch: true})
  ]).then(function(){
    var server = http.createServer(app).listen(port, ip, function(){
      hexo.log.info('Hexo is running at ' + 'http://%s:%d%s'.underline + '. Press Ctrl+C to stop.', ip, port, root);
      hexo.emit('server');
    });

    server.on('error', function(err){
      switch (err.code){
        case 'EADDRINUSE':
          hexo.log.fatal('Port %d has been used. Try other port instead.', port);
          break;

        case 'EACCES':
          hexo.log.fatal('Permission denied. You can\'t use port ' + port + '.');
          break;
      }

      throw err;
    });
  });
}

hexo.extend.filter.register('server_middleware', require('./middlewares/logger'));
hexo.extend.filter.register('server_middleware', require('./middlewares/header'));
hexo.extend.filter.register('server_middleware', require('./middlewares/route'));
hexo.extend.filter.register('server_middleware', require('./middlewares/static'));
hexo.extend.filter.register('server_middleware', require('./middlewares/redirect'));
hexo.extend.filter.register('server_middleware', require('./middlewares/gzip'));

hexo.extend.console.register('server', 'Start the server.', {
  desc: 'Start the server and watch for file changes.',
  options: [
    {name: '-i, --ip', desc: 'Override the default server IP. Bind to all IP address by default.'},
    {name: '-p, --port', desc: 'Override the default port.'},
    {name: '-s, --static', desc: 'Only serve static files.'},
    {name: '-l, --log [format]', desc: 'Enable logger. Override the logger format.'},
    // {name: '-d, --drafts', desc: 'Serve draft posts.'}
  ]
}, server);