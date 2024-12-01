const path = require('path');
const serverSSL = require('./server-ssl');
const serverHTTP = require('./server-http');

/**
 * @param {Record<string, any>} args
 */
module.exports = function(args) {
  const key = args.ck || args.key || path.join(__dirname, '..', 'certificates/localhost.key');
  const cert = args.c || args.cert || path.join(__dirname, '..', 'certificates/localhost.crt');
  const ssl = args.h || args.ssl || false;
  if (ssl || ('c' in args && 'ck' in args) || ('cert' in args && 'key' in args)) {
    return serverSSL.bind(this)(Object.assign(args, { key, cert }));
  }
  return serverHTTP.bind(this)(args);
};
