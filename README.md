# hexo-server

[![Build Status](https://travis-ci.org/hexojs/hexo-server.svg?branch=master)](https://travis-ci.org/hexojs/hexo-server)  [![NPM version](https://badge.fury.io/js/hexo-server.svg)](http://badge.fury.io/js/hexo-server) [![Coverage Status](https://img.shields.io/coveralls/hexojs/hexo-server.svg)](https://coveralls.io/r/hexojs/hexo-server?branch=master) [![Build status](https://ci.appveyor.com/api/projects/status/ycbw8t7w3kjju0tv/branch/master?svg=true)](https://ci.appveyor.com/project/tommy351/hexo-server/branch/master)

Server module for [Hexo].

## Installation

``` bash
$ npm install hexo-server --save
```

## Usage

``` bash
$ hexo server
```

## Options

``` yaml
server:
  port: 4000
  log: false
  ip: 0.0.0.0
```

- **port**: Server port
- **log**: Display request info on the console. Always enabled in debug mode.
- **ip**: Server IP

## License

MIT

[Hexo]: http://hexo.io/