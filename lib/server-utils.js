'use strict';

const net = require('net');
const Promise = require('bluebird');

/**
 * Starts a given server and listens on the specified port and IP.
 *
 * @param {net.Server} server - The server instance to start.
 * @param {number} port - The port number to listen on.
 * @param {string} ip - The IP address to bind the server to.
 * @returns {Promise<net.Server>} A Promise that resolves with the server once it's listening.
 */
function startServer(server, port, ip) {
  return new Promise((resolve, reject) => {
    server.listen(port, ip, resolve);
    server.on('error', reject);
  }).then(() => server);
}

/**
 * Checks whether a port can be used on the specified IP by attempting to bind a temporary server.
 *
 * @param {string} ip - The IP address to bind the test server to.
 * @param {number} port - The port number to test.
 * @returns {Promise<void>} A Promise that resolves if the port is available, or rejects on error.
 */
function checkPort(ip, port) {
  if (port > 65535 || port < 1) {
    return Promise.reject(new RangeError(`Port number ${port} is invalid. Try a number between 1 and 65535.`));
  }

  const server = net.createServer();

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.once('listening', resolve);
    server.listen(port, ip);
  }).then(() => { server.close(); });
}

/**
 * Formats a network address into a URL string.
 *
 * @param {string} ip - The IP address (e.g., '127.0.0.1', '::', '0.0.0.0').
 * @param {number} port - The port number.
 * @param {string} root - The root path to append (e.g., '/', '/app').
 * @param {boolean} [useHttps=false] - Whether to use HTTPS instead of HTTP.
 * @returns {string} The formatted URL.
 */
function formatAddress(ip, port, root, useHttps = false) {
  let hostname = ip;
  if (ip === '0.0.0.0' || ip === '::') {
    hostname = 'localhost';
  }
  // Fix IPV6
  if (hostname.includes(':')) {
    hostname = `[${hostname}]`;
  }
  // Change protocol based on HTTPS or HTTP
  const protocol = useHttps ? 'https' : 'http';
  const path = root.startsWith('/') ? root : `/${root}`;
  return new URL(`${protocol}://${hostname}:${port}${path}`).toString();
}

module.exports = {
  startServer,
  checkPort,
  formatAddress
};
