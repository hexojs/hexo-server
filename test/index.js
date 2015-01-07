var should = require('chai').should();
var Hexo = require('hexo');
var request = require('supertest');
var pathFn = require('path');
var fs = require('hexo-fs');
var Promise = require('bluebird');

describe('server', function(){
  var hexo = new Hexo(pathFn.join(__dirname, 'server_test'), {silent: true});
  var themeDir = pathFn.join(hexo.base_dir, 'themes', 'test');
  var server = require('../lib/server');

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
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/logger'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/header'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/route'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/static'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/redirect'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/gzip'));

  before(function(){
    return Promise.all([
      fs.mkdirs(themeDir),
      fs.writeFile(hexo.config_path, 'theme: test')
    ]).then(function(){
      return hexo.init();
    });
  });

  after(function(){
    return fs.rmdir(hexo.base_dir);
  });

  function stopServer(app, callback){
    return function(err){
      if (err) return callback(err);
      app.close(callback);
    };
  }

  it('X-Powered-By header', function(done){
    server.call(hexo, {$test_mode: true}).then(function(app){
      request(app).get('/')
      .expect('X-Powered-By', 'Hexo')
      .expect(200, 'index', stopServer(app, done));
    });
  });

  it('Content-Type header', function(done){
    server.call(hexo, {$test_mode: true}).then(function(app){
      request(app).get('/bar.jpg')
      .expect('Content-Type', 'image/jpeg')
      .end(stopServer(app, done));
    });
  });

  it('static asset', function(done){
    fs.writeFile(pathFn.join(hexo.public_dir, 'test.html'), 'test html').then(function(){
      server.call(hexo, {$test_mode: true}).then(function(app){
        request(app).get('/test.html')
        .expect('Content-Type', 'text/html; charset=UTF-8')
        .expect(200, 'test html', stopServer(app, done));
      });
    }, done);
  });

  it('invalid port', function(){
    try {
      server.call(hexo, {port: -100});
    } catch (err){
      err.should.have.property('message', 'Port number -100 is invalid. Try a number between 1 and 65535.');
    }

    try {
      server.call(hexo, {port: 70000});
    } catch (err){
      err.should.have.property('message', 'Port number 70000 is invalid. Try a number between 1 and 65535.');
    }
  });

  it('append trailing slash', function(done){
    server.call(hexo, {$test_mode: true}).then(function(app){
      request(app).get('/foo')
      .expect('Location', '/foo/')
      .expect(302, 'Redirecting', stopServer(app, done));
    });
  });

  it('don\'t append trailing slash if URL has a extension name', function(done){
    server.call(hexo, {$test_mode: true}).then(function(app){
      request(app).get('/bar.txt')
      .expect(404, stopServer(app, done));
    });
  });

  it('only send headers on HEAD request', function(done){
    server.call(hexo, {$test_mode: true}).then(function(app){
      request(app).head('/')
      .expect(200, '', stopServer(app, done));
    });
  });

  it('redirect to root URL if root is not `/`', function(done){
    hexo.config.root = '/test/';

    server.call(hexo, {$test_mode: true}).then(function(app){
      hexo.config.root = '/';

      request(app).get('/')
      .expect('Location', '/test/')
      .expect(301, 'Redirecting', stopServer(app, done));
    });
  });
});