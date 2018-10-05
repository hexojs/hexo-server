'use strict';

var should = require('chai').should(); // eslint-disable-line
var Hexo = require('hexo');
var request = require('supertest-promised');
var pathFn = require('path');
var fs = require('hexo-fs');
var Promise = require('bluebird');
var uuid = require('uuid');
var sinon = require('sinon');
var http = require('http');

describe('server', function() {
  var hexo = new Hexo(pathFn.join(__dirname, 'server_test'), {silent: true});
  var themeDir = pathFn.join(hexo.base_dir, 'themes', 'test');
  var server = require('../lib/server').bind(hexo);

  // Default config
  hexo.config.server = {
    port: 4000,
    log: false,
    ip: '0.0.0.0',
    compress: false,
    header: true
  };

  // Register fake generator
  hexo.extend.generator.register('test', function() {
    return [
      {path: '', data: 'index'},
      {path: 'foo/', data: 'foo'},
      {path: 'bar.jpg', data: 'bar'}
    ];
  });

  // Register middlewares
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/header'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/gzip'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/logger'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/route'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/static'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/redirect'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/proxy'));

  before(function() {
    return Promise.all([
      fs.mkdirs(themeDir),
      fs.writeFile(hexo.config_path, 'theme: test')
    ]).then(function() {
      return hexo.init();
    });
  });

  afterEach(function() {
    return hexo.unwatch();
  });

  after(function() {
    return fs.rmdir(hexo.base_dir);
  });

  function prepareServer(options) {
    options = options || {};

    var connections = {};

    return server(options).then(function(app) {
      app.on('connection', function(conn) {
        var id = uuid.v4();

        connections[id] = conn;

        conn.on('close', function() {
          conn.unref();
          delete connections[id];
        });
      });

      return app;
    }).disposer(function(app) {
      Object.keys(connections).forEach(function(id) {
        var conn = connections[id];

        conn.unref();
        conn.destroy();
      });

      app.unref();
      app.close();
    });
  }

  it('X-Powered-By header', function() {
    return Promise.using(prepareServer(), function(app) {
      return request(app).get('/')
        .expect('X-Powered-By', 'Hexo')
        .expect(200, 'index')
        .end();
    });
  });

  it('Remove X-Powered-By header if options.header is false', function() {
    hexo.config.server.header = false;

    return Promise.using(prepareServer(), function(app) {
      return request(app).get('/')
        .expect(200)
        .end()
        .then(function(res) {
          res.headers.should.not.have.property('x-powered-by');
        });
    }).finally(function() {
      hexo.config.server.header = true;
    });
  });

  it('Content-Type header', function() {
    return Promise.using(prepareServer(), function(app) {
      return request(app).get('/bar.jpg')
        .expect('Content-Type', 'image/jpeg')
        .expect(200)
        .end();
    });
  });

  it('Enable compression if options.compress is true', function() {
    hexo.config.server.compress = true;

    return Promise.using(prepareServer(), function(app) {
      return request(app).get('/')
        .expect('Content-Encoding', 'gzip')
        .end();
    }).finally(function() {
      hexo.config.server.compress = false;
    });
  });

  it('Disable compression if options.compress is false', function() {
    return Promise.using(prepareServer(), function(app) {
      return request(app).get('/')
        .end()
        .then(function(res) {
          res.headers.should.not.have.property('Content-Encoding');
        });
    });
  });

  it('static asset', function() {
    var path = pathFn.join(hexo.public_dir, 'test.html');
    var content = 'test html';

    return fs.writeFile(path, content).then(function() {
      return Promise.using(prepareServer(), function(app) {
        return request(app).get('/test.html')
          .expect('Content-Type', 'text/html; charset=UTF-8')
          .expect(200, content)
          .end();
      });
    }).finally(function() {
      return fs.unlink(path);
    });
  });

  it('invalid port', function() {
    return server({port: -100}).catch(function(err) {
      err.should.have.property('message', 'Port number -100 is invalid. Try a number between 1 and 65535.');
    });
  });

  it('invalid port > 65535', function() {
    return server({port: 65536}).catch(function(err) {
      err.should.have.property('message', 'Port number 65536 is invalid. Try a number between 1 and 65535.');
    });
  });

  it('change port setting', function() {
    return Promise.using(prepareServer({port: 5000}), function(app) {
      return request(app).get('/')
        .expect(200, 'index')
        .end();
    });
  });

  it('check port before starting', function() {
    return Promise.using(prepareServer(), function(app) {
      return server({}).catch(function(err) {
        err.code.should.eql('EADDRINUSE');
      });
    });
  });

  it('change ip setting', function() {
    return server({ip: '1.2.3.4'}).catch(function(err) {
      err.code.should.eql('EADDRNOTAVAIL');
    });
  });

  it('append trailing slash', function() {
    return Promise.using(prepareServer(), function(app) {
      return request(app).get('/foo')
        .expect('Location', '/foo/')
        .expect(302, 'Redirecting')
        .end();
    });
  });

  it('preserve query part after appending trailing slash', function() {
    return Promise.using(prepareServer(), function(app) {
      return request(app).get('/foo?x=y')
        .expect('Location', '/foo/?x=y')
        .expect(302, 'Redirecting')
        .end();
    });
  });

  it('don\'t append trailing slash if URL has a extension name', function() {
    return Promise.using(prepareServer(), function(app) {
      return request(app).get('/bar.txt')
        .expect(404)
        .end();
    });
  });

  it('only send headers on HEAD request', function() {
    return Promise.using(prepareServer(), function(app) {
      return request(app).head('/')
        .expect(200, '')
        .end();
    });
  });

  it('redirect to root URL if root is not `/`', function() {
    hexo.config.root = '/test/';

    return Promise.using(prepareServer(), function(app) {
      return request(app).get('/')
        .expect('Location', '/test/')
        .expect(302, 'Redirecting')
        .end();
    }).finally(function() {
      hexo.config.root = '/';
    });
  });

  it('display localhost instead of 0.0.0.0', function() {
    var spy = sinon.spy();
    sinon.stub(hexo.log, 'info', spy);

    return Promise.using(prepareServer(), function(app) {
      spy.args[1][1].should.contain('localhost');
    }).finally(function() {
      hexo.log.info.restore();
    });
  });

  it('display localhost instead of [::]', function() {
    var spy = sinon.spy();
    sinon.stub(hexo.log, 'info', spy);

    return Promise.using(prepareServer({ip: '::'}), function(app) {
      spy.args[1][1].should.contain('localhost');
    }).finally(function() {
      hexo.log.info.restore();
    });
  });

  it('use proxy if given', function() {
    var serverConfig = hexo.config.server;
    hexo.config.server = Object.assign({
      proxyPath: '/proxy',
      proxyUrl: 'http://localhost:17320/'
    }, hexo.config.server);

    var fakeServer = http.createServer(function(req, res) {
      res.end('OK');
    }).listen(17320);

    return Promise.using(prepareServer(), function(app) {
      return request(app).get('/proxy/')
        .expect(200, 'OK')
        .end();
    }).finally(function() {
      fakeServer.close();
      hexo.config.server = serverConfig;
    });
  });
});
