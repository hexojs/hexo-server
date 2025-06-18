'use strict';

const connect = require('connect');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { underline } = require('picocolors');
const open = require('open');
const { checkPort, startServer, formatAddress } = require('./server-utils');

/**
 * Starts a local HTTP or HTTPS server for Hexo with optional live reload or static serving.
 *
 * @this {import('hexo')}
 * @param {Object} args - CLI arguments.
 * @param {boolean} [args.https] - Use HTTPS if true.
 * @param {string} [args.key] - Path to SSL key (required for HTTPS).
 * @param {string} [args.cert] - Path to SSL cert (required for HTTPS).
 */
const serverCore = async function(args) {
  const app = connect();
  const { config, extend, load, watch, log, emit, unwatch } = this;

  const ip = args.i || args.ip || config.server.ip || undefined;
  const port = parseInt(args.p || args.port || config.server.port || process.env.port, 10) || 4000;
  const root = config.root;
  const useHttps = !!(args.https || args.key || args.cert);

  let serverInstance;
  if (useHttps) {
    if (!args.key || !args.cert) {
      throw new Error('SSL key and cert are required for HTTPS.');
    }
    const sslOptions = {
      key: fs.readFileSync(args.key),
      cert: fs.readFileSync(args.cert)
    };
    serverInstance = https.createServer(sslOptions, app);
  } else {
    serverInstance = http.createServer(app);
  }

  try {
    await checkPort(ip, port);
    await extend.filter.exec('server_middleware', app, { context: this });

    args.s || args.static ? await load() : await watch();

    const server = await startServer(serverInstance, port, ip);
    const addr = server.address();
    const url = formatAddress(ip || addr.address, addr.port, root, useHttps);

    log.info('Hexo is running at %s . Press Ctrl+C to stop.', underline(url));
    emit('server');

    if (args.o || args.open) await open(url);

    return server;
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      log.fatal(`Port ${port} has been used. Try another port instead.`);
    } else if (err.code === 'EACCES') {
      log.fatal(`Permission denied. You can't use port ${port}.`);
    }

    unwatch();
    throw err;
  }
};

module.exports = serverCore;
module.exports.serverCore = serverCore; // For backward compatibility
