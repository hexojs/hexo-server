'use strict';

const path = require('path');
const fs = require('fs');
const { X509Certificate, createPrivateKey } = require('crypto');
const { execSync } = require('child_process');
const Log = console;
const MKCERT_VERSION = 'v1.4.4';
const cacheDirectory = path.join(process.cwd(), 'node_modules/.cache/hexo-server-certificates');
const keyPath = path.join(cacheDirectory, 'localhost-key.pem');
const certPath = path.join(cacheDirectory, 'localhost.pem');

/**
 * Returns the platform-specific mkcert binary name based on OS and architecture.
 *
 * @returns {string} The name of the mkcert binary file.
 * @throws {Error} If the platform is not supported.
 */
function getBinaryName() {
  const platform = process.platform;
  const arch = process.arch === 'x64' ? 'amd64' : process.arch;

  if (platform === 'win32') {
    return `mkcert-${MKCERT_VERSION}-windows-${arch}.exe`;
  }
  if (platform === 'darwin') {
    return `mkcert-${MKCERT_VERSION}-darwin-${arch}`;
  }
  if (platform === 'linux') {
    return `mkcert-${MKCERT_VERSION}-linux-${arch}`;
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

/**
 * Downloads the mkcert binary for the current platform and architecture.
 *
 * If the binary already exists in the cache directory, it returns the cached path.
 * Otherwise, it downloads the binary, saves it to disk, sets executable permissions,
 * and returns the binary path.
 *
 * @async
 * @returns {Promise<string|undefined>} The path to the downloaded or cached mkcert binary, or undefined if an error occurs.
 */
async function downloadBinary() {
  try {
    const binaryName = getBinaryName();
    const binaryPath = path.join(cacheDirectory, binaryName);
    const downloadUrl = `https://github.com/FiloSottile/mkcert/releases/download/${MKCERT_VERSION}/${binaryName}`;

    // Fetch remote file size first
    const headResponse = await fetch(downloadUrl, { method: 'HEAD' });

    if (!headResponse.ok) {
      throw new Error(`Failed to fetch file header. Status: ${headResponse.status}`);
    }

    const remoteFileSize = parseInt(headResponse.headers.get('content-length'), 10);

    if (fs.existsSync(binaryPath)) {
      const localStats = await fs.promises.stat(binaryPath);
      // Fix file corruption
      if (localStats.size === remoteFileSize) {
        Log.info('Local mkcert binary is up-to-date, skipping download.');
        return binaryPath;
      }
      Log.info('Local mkcert binary size mismatch, re-downloading...');
    } else {
      await fs.promises.mkdir(cacheDirectory, { recursive: true });
    }

    Log.info('Downloading mkcert package...');

    const response = await fetch(downloadUrl);

    if (!response.ok || !response.body) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    Log.info('Download response was successful, writing to disk');

    const binaryWriteStream = fs.createWriteStream(binaryPath);

    await response.body.pipeTo(
      new WritableStream({
        write(chunk) {
          return new Promise((resolve, reject) => {
            binaryWriteStream.write(chunk, error => {
              if (error) {
                reject(error);
                return;
              }
              resolve();
            });
          });
        },
        close() {
          return new Promise((resolve, reject) => {
            binaryWriteStream.close(error => {
              if (error) {
                reject(error);
                return;
              }
              resolve();
            });
          });
        }
      })
    );

    await fs.promises.chmod(binaryPath, 0o755);

    return binaryPath;
  } catch (err) {
    Log.error('Error downloading mkcert:', err);
    throw err; // Important to rethrow if you want callers to know the download failed
  }
}

/**
 * @typedef {Object} SelfSignedCertificate
 * @property {string} key - Path to the generated private key file.
 * @property {string} cert - Path to the generated certificate file.
 * @property {string} rootCA - Path to the root Certificate Authority (CA) certificate.
 */

/**
 * Creates a self-signed SSL certificate using mkcert.
 *
 * @async
 * @param {string|string[]} [host] - Optional additional host to include in the certificate.
 * @returns {Promise<SelfSignedCertificate|undefined>} The paths to key, cert, and rootCA, or undefined on error.
 */
async function createSelfSignedCertificate(host) {
  try {
    const binaryPath = await downloadBinary();
    if (!binaryPath) throw new Error('missing mkcert binary');

    await fs.promises.mkdir(cacheDirectory, { recursive: true });

    // Ensure host is always an array
    let hostList = [];
    if (Array.isArray(host)) {
      hostList = host;
    } else if (typeof host === 'string' && host.length > 0) {
      hostList = [host];
    }

    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      const cert = new X509Certificate(fs.readFileSync(certPath));
      const key = fs.readFileSync(keyPath);

      // Check the certificate for each host
      for (const h of hostList) {
        if (!cert.checkHost(h)) {
          Log.warn(`Certificate is not valid for host: ${h}`);
        } else {
          Log.info(`Certificate is valid for host: ${h}`);
        }
      }

      if (cert.checkPrivateKey(createPrivateKey(key))) {
        Log.info('Using already generated self signed certificate');
        const caLocation = execSync(`"${binaryPath}" -CAROOT`).toString().trim();
        Log.info(`CA location at ${caLocation}`);

        return {
          key: keyPath,
          cert: certPath,
          rootCA: `${caLocation}/rootCA.pem`
        };
      }
    }

    // Download mkcert binary
    downloadBinary();

    Log.info('Attempting to generate self signed certificate. This may prompt for your password');

    const defaultHosts = ['localhost', '127.0.0.1', '::1'];
    const allHosts = [...defaultHosts, ...hostList.filter(h => !defaultHosts.includes(h))];

    // Install certificate for all hosts
    execSync(`"${binaryPath}" -install -key-file "${keyPath}" -cert-file "${certPath}" ${allHosts.join(' ')}`, {
      stdio: 'ignore'
    });

    const caLocation = execSync(`"${binaryPath}" -CAROOT`).toString().trim();

    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      throw new Error('Certificate files not found');
    }

    Log.info(`CA Root certificate created in ${caLocation}`);
    Log.info(`Certificates created in ${cacheDirectory}`);

    return {
      key: keyPath,
      cert: certPath,
      rootCA: `${caLocation}/rootCA.pem`
    };
  } catch (err) {
    Log.error('Failed to generate self-signed certificate. Falling back to http.', err);
  }
}

module.exports = { createSelfSignedCertificate, getBinaryName, downloadBinary, cacheDirectory, keyPath, certPath };

createSelfSignedCertificate();
