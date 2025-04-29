# hexo-server

[![Build Status](https://github.com/hexojs/hexo-server/workflows/Tester/badge.svg)](https://github.com/hexojs/hexo-server/actions?query=workflow%3ATester)
[![NPM version](https://badge.fury.io/js/hexo-server.svg)](https://www.npmjs.com/package/hexo-server)
[![Coverage Status](https://img.shields.io/coveralls/hexojs/hexo-server.svg)](https://coveralls.io/r/hexojs/hexo-server?branch=master)

Server module for [Hexo].

## Installation

```bash
$ npm install hexo-server --save
```

## Usage

```bash
$ hexo server
```

Option | Description | Default
--- | --- | ---
`-i`, `--ip` | Override the default server IP. | `::` when IPv6 is available, else `0.0.0.0` (note: in most systems, `::` also binds to `0.0.0.0`)
`-p`, `--port` | Override the default port. | `4000`
`-s`, `--static` | Only serve static files. | `false`
`-l`, `--log [format]` | Enable logger. Override log format. | `false`
`-o`, `--open` | Immediately open the server url in your default web browser. | `false`
`-c`, `--cert` | Certificate path | `<lib>/certificates/localhost.crt`
`-ck`, `--key` | Certificate key path | `<lib>/certificates/localhost.key`
`h`, `--ssl` | Enable SSL localhost. If `--cert` and `--key` is present, ssl will enabled automatically. If `--cert` and `--key` is not present, but `--ssl` is preset, default certificate will be applied. | `false`

## Options

```yaml
server:
  port: 4000
  log: false
  ip: 0.0.0.0
  compress: false
  cache: false
  header: true
  serveStatic:
    extensions:
    - html
```

- **port**: Server port
- **log**: Display request info on the console. Always enabled in debug mode.
- **ip**: Server IP
- **compress**: Enable GZIP compression
- **cache**: Enable cache for rendered content
  - This can speed up server response. However, any changes will no longer take effect in real time.
  - Suitable for production environment only.
- **header**: Add `X-Powered-By: Hexo` header
- **serveStatic**: Extra options passed to [serve-static](https://github.com/expressjs/serve-static#options)

## Generate self-certificate

You can build your own OpenSSL from the official source: [https://openssl-library.org/source/](https://openssl-library.org/source/).

### For Windows Users
You can download precompiled OpenSSL binaries for Windows from trusted sources like:
- [https://slproweb.com/products/Win32OpenSSL.html](https://slproweb.com/products/Win32OpenSSL.html)

Make sure to install the version matching your system architecture (32-bit or 64-bit).

Once installed, you can generate a self-signed certificate using the command line:

### Default config

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout localhost.key -out localhost.crt
```

### Custom config

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout localhost.key -out localhost.crt -config openssl.cnf
```

### `openssl.cnf` contents

```conf
[ req ]
default_bits       = 2048
distinguished_name = req_distinguished_name
req_extensions     = req_ext

[ req_distinguished_name ]
countryName                  = Country Name (2 letter code)
countryName_default          = ID
stateOrProvinceName          = State or Province Name (full name)
stateOrProvinceName_default  = East Java
localityName                 = Locality Name (eg, city)
localityName_default         = Surabaya
organizationName             = Organization Name (eg, company)
organizationName_default     = WMI
organizationalUnitName       = Organizational Unit Name (eg, section)
organizationalUnitName_default = Developer
commonName                   = Common Name (e.g. server FQDN or YOUR name)
commonName_default           = dev.webmanajemen.com
commonName_max               = 64
emailAddress                 = Email Address
emailAddress_default         = dimaslanjaka@gmail.com

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = dev.webmanajemen.com
DNS.2 = localhost
DNS.3 = 192.168.1.75
DNS.4 = 127.0.0.1
```

#### description

- `alt_names` is your dev/localhost domain. (set on your `hosts` file)

## License

MIT

[Hexo]: http://hexo.io/
