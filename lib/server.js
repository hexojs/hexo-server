const path = require('path');
const serverSSL = require('./server-ssl');
const serverHTTP = require('./server-http');

/**
 * @param {Record<string, any>} args
 */
module.exports = function(args) {
  const {cert = path.join(__dirname, '..', 'certificates/localhost.crt'), key = path.join(__dirname, '..', 'certificates/localhost.key'), ssl = false} = args;
  if (ssl || ('cert' in args && 'key' in args)) {
    return serverSSL.bind(this)(Object.assign(args, {key, cert}));
  }
  return serverHTTP.bind(this)(args);
};
