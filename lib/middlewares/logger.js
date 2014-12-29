var morgan = require('morgan');

module.exports = function(app){
  var config = this.config;
  var args = this.env.args || {};
  var logger = args.l || args.log || config.server.log;

  if (!logger) return;
  if (typeof logger !== 'string') logger = 'dev';

  app.use(morgan(logger));
};