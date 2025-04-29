'use strict';

const serverSSL = require('./server-ssl');
const serverHTTP = require('./server-http');
const { createSelfSignedCertificate, keyPath, certPath } = require('./mkcert');

/**
 * @param {Record<string, any>} args
 */
module.exports = function(args) {
  const key = args.ck || args.key || keyPath;
  const cert = args.c || args.cert || certPath;
  const ssl = args.h || args.ssl || false;
  if (ssl || ('c' in args && 'ck' in args) || ('cert' in args && 'key' in args)) {
    // Attempt to create self-signed certificate
    createSelfSignedCertificate();
    return serverSSL.bind(this)(Object.assign(args, { key, cert }));
  }
  return serverHTTP.bind(this)(args);
};
