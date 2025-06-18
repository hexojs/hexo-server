'use strict';

const serverSSL = require('./server-ssl');
const serverHTTP = require('./server-http');
const { createSelfSignedCertificate, keyPath, certPath } = require('./mkcert');

/**
 * Starts the appropriate server (HTTP or HTTPS) based on CLI args.
 *
 * @param {Record<string, any>} args
 */
module.exports = function(args) {
  const hasSSLArgs
    = args.h || args.ssl
    || (('ck' in args || 'key' in args) && ('c' in args || 'cert' in args));

  if (hasSSLArgs) {
    const key = args.ck || args.key || keyPath;
    const cert = args.c || args.cert || certPath;

    createSelfSignedCertificate();
    return serverSSL.call(this, { ...args, key, cert });
  }

  return serverHTTP.call(this, args);
};
