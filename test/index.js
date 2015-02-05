'use strict';

var should = require('chai').should();
var Hexo = require('hexo');
var request = require('supertest');
var pathFn = require('path');
var fs = require('hexo-fs');
var Promise = require('bluebird');
var net = require('net');

describe('server', function(){
  var hexo = new Hexo(pathFn.join(__dirname, 'server_test'), {silent: true});
  var themeDir = pathFn.join(hexo.base_dir, 'themes', 'test');
  var server = require('../lib/server').bind(hexo);

  // Default config
  hexo.config.server = {
    port: 4000,
    log: false,
    ip: '0.0.0.0'
  };

  // Register fake generator
  hexo.extend.generator.register('test', function(){
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

  before(function(){
    return Promise.all([
      fs.mkdirs(themeDir),
      fs.writeFile(hexo.config_path, 'theme: test')
    ]).then(function(){
      return hexo.init();
    });
  });

  afterEach(function(){
    return hexo.unwatch();
  });

  after(function(){
    return fs.rmdir(hexo.base_dir);
  });

  function stopServer(app, callback){
    return function(err){
      app.close(function(err_){
        if (err) return callback(err);
        if (err_) return callback(err_);

        callback();
      });
    };
  }

  it('X-Powered-By header', function(done){
    server({}).then(function(app){
      request('http://localhost:4000').get('/')
        .expect('X-Powered-By', 'Hexo')
        .expect(200, 'index', stopServer(app, done));
    });
  });

  it('Content-Type header', function(done){
    server({}).then(function(app){
      request('http://localhost:4000').get('/bar.jpg')
        .expect('Content-Type', 'image/jpeg')
        .end(stopServer(app, done));
    });
  });

  it('Gzip', function(done){
    server({}).then(function(app){
      request('http://localhost:4000').get('/')
        .expect('Content-Encoding', 'gzip')
        .end(stopServer(app, done));
    });
  });

  it('static asset', function(done){
    fs.writeFile(pathFn.join(hexo.public_dir, 'test.html'), 'test html').then(function(){
      server({}).then(function(app){
        request('http://localhost:4000').get('/test.html')
          .expect('Content-Type', 'text/html; charset=UTF-8')
          .expect(200, 'test html', stopServer(app, done));
      });
    }, done);
  });

  it('invalid port', function(){
    return server({port: -100}).catch(function(err){
      err.should.have.property('message', 'Port number -100 is invalid. Try a number between 1 and 65535.');
    });
  });

  it('invalid port > 65535', function(){
    return server({port: 65536}).catch(function(err){
      err.should.have.property('message', 'Port number 65536 is invalid. Try a number between 1 and 65535.');
    });
  });

  it('change port setting', function(done){
    server({port: 5000}).then(function(app){
      request('http://localhost:5000').get('/')
        .expect(200, 'index', stopServer(app, done));
    });
  });

  it('check port before starting', function(callback){
    var s = net.createServer();

    s.listen(4000, function(){
      server({}).catch(function(err){
        err.code.should.eql('EADDRINUSE');
        callback();
      }).finally(function(){
        s.close();
      });
    });
  });

  it('change ip setting', function(){
    return server({ip: '1.2.3.4'}).catch(function(err){
      err.code.should.eql('EADDRNOTAVAIL');
    });
  });

  it('append trailing slash', function(done){
    server({}).then(function(app){
      request('http://localhost:4000').get('/foo')
        .expect('Location', '/foo/')
        .expect(302, 'Redirecting', stopServer(app, done));
    });
  });

  it('don\'t append trailing slash if URL has a extension name', function(done){
    server({}).then(function(app){
      request('http://localhost:4000').get('/bar.txt')
        .expect(404, stopServer(app, done));
    });
  });

  it('only send headers on HEAD request', function(done){
    server({}).then(function(app){
      request('http://localhost:4000').head('/')
        .expect(200, '', stopServer(app, done));
    });
  });

  it('redirect to root URL if root is not `/`', function(done){
    hexo.config.root = '/test/';

    server({}).then(function(app){
      hexo.config.root = '/';

      request('http://localhost:4000').get('/')
        .expect('Location', '/test/')
        .expect(301, 'Redirecting', stopServer(app, done));
    });
  });
});