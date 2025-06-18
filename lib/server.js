'use strict';

const serverCore = require('./server-core');
const { createSelfSignedCertificate, keyPath, certPath } = require('./mkcert');

/**
 * Starts the appropriate server (HTTP or HTTPS) based on CLI arguments.
 *
 * @this {import('hexo')}
 * @param {Record<string, any>} args - CLI arguments.
 * @param {boolean} [args.h] - Alias for `--https`, enables HTTPS mode.
 * @param {boolean} [args.ssl] - Enables HTTPS mode.
 * @param {string} [args.ck] - Alias for `--key`, path to SSL key.
 * @param {string} [args.key] - Path to SSL key.
 * @param {string} [args.c] - Alias for `--cert`, path to SSL certificate.
 * @param {string} [args.cert] - Path to SSL certificate.
 * @returns {Promise<import('http').Server|import('https').Server>} The running HTTP/HTTPS server instance.
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
