'use strict';

const serverCore = require('./server-core');
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
    return serverCore.call(this, { ...args, key, cert, https: true });
  }

  return serverCore.call(this, {...args, https: false });
};
