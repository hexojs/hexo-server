'use strict';

const chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();
const Hexo = require('hexo');
const request = require('supertest');
const { join } = require('path');
const fs = require('hexo-fs');
const Promise = require('bluebird');
const { v4: uuidv4 } = require('uuid');
const sinon = require('sinon');
const { deepMerge } = require('hexo-util');

describe('server', () => {
  const hexo = new Hexo(join(__dirname, 'server_test'), {silent: true});
  const themeDir = join(hexo.base_dir, 'themes', 'test');
  const defaultCfg = deepMerge(hexo.config, {
    server: {
      port: 4000,
      log: false,
      ip: '0.0.0.0',
      compress: false,
      header: true
    }
  });
  const server = require('../lib/server').bind(hexo);

  // Register fake generator
  hexo.extend.generator.register('test', () => [
    {path: 'index.html', data: 'index'},
    {path: 'foo/index.html', data: 'foo'},
    {path: 'bar/baz.html', data: 'baz'},
    {path: 'bar.jpg', data: 'bar'},
    {path: 'baz.zzz', data: ''}
  ]);

  // Register middlewares
  hexo.extend.filter.register('server_middleware', function(app) {
    app.use('/baz.zzz', function (req, res, next) {
      res.setHeader('Content-Type', 'application/x-custom');
      next();
    });
  });
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/header'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/gzip'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/logger'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/route'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/static'));
  hexo.extend.filter.register('server_middleware', require('../lib/middlewares/redirect'));

  before(() => Promise.all([
    fs.mkdirs(themeDir),
    fs.writeFile(hexo.config_path, 'theme: test')
  ]).then(() => hexo.init()));

  beforeEach(() => {
    hexo.config = deepMerge(hexo.config, defaultCfg);
  });

  afterEach(() => hexo.unwatch());

  after(() => fs.rmdir(hexo.base_dir));

  function prepareServer(options = {}) {
    const connections = {};

    return server(options).then(app => {
      app.on('connection', conn => {
        const id = uuidv4();

        connections[id] = conn;

        conn.on('close', () => {
          conn.unref();
          delete connections[id];
        });
      });

      return app;
    }).disposer(app => {
      Object.keys(connections).forEach(id => {
        const conn = connections[id];

        conn.unref();
        conn.destroy();
      });

      app.unref();
      app.close();
    });
  }

  it('X-Powered-By header', () => Promise.using(prepareServer(), app => request(app).get('/')
    .expect('X-Powered-By', 'Hexo')
    .expect(200, 'index')));

  it('Remove X-Powered-By header if options.header is false', () => {
    hexo.config.server.header = false;

    return Promise.using(prepareServer(), app => request(app).get('/')
      .expect(200)
      .then(res => {
        res.headers.should.not.have.property('x-powered-by');
      }));
  });

  it('Content-Type header', () => Promise.using(prepareServer(), app => request(app).get('/bar.jpg')
    .expect('Content-Type', 'image/jpeg')
    .expect(200)));

  it('Do not try to overwrite Content-Type header', function() {
    return Promise.using(prepareServer(), function(app) {
      return request(app).get('/baz.zzz')
        .expect('Content-Type', 'application/x-custom')
        .expect(200)
        .end();
    });
  });

  it('Enable compression if options.compress is true', () => {
    hexo.config.server.compress = true;

    return Promise.using(
      prepareServer(),
      app => request(app).get('/').expect('Content-Encoding', 'gzip')
    );
  });

  it('Disable compression if options.compress is false', () => Promise.using(prepareServer(), app => request(app).get('/')
    .then(res => {
      res.headers.should.not.have.property('Content-Encoding');
    })));

  it('static asset', () => {
    const path = join(hexo.public_dir, 'test.html');
    const content = 'test html';

    return fs.writeFile(path, content).then(() => Promise.using(prepareServer(), app => request(app).get('/test.html')
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect(200, content))).finally(() => fs.unlink(path));
  });

  it('invalid port', () => server({port: -100}).should.to.rejectedWith(RangeError, 'Port number -100 is invalid. Try a number between 1 and 65535.'));

  it('invalid port > 65535', () => server({port: 65536}).should.to.rejectedWith(RangeError, 'Port number 65536 is invalid. Try a number between 1 and 65535.'));

  it('change port setting', () => Promise.using(prepareServer({port: 5000}), app => request(app).get('/').expect(200, 'index')));

  it('check port before starting', () => Promise.using(prepareServer(), app => server({}).should.rejected.and.eventually.have.property('code', 'EADDRINUSE')));

  it('change ip setting', () => server({ip: '1.2.3.4'}).should.rejected.and.eventually.have.property('code', 'EADDRNOTAVAIL'));

  // location `bar/baz.html`; request `bar/baz`; proxy to the location
  it('proxy to .html if available', () => {
    return Promise.using(prepareServer(), app => request(app).get('/bar/baz')
      .expect(200)
      .expect('Content-Type', 'text/html'));
  });

  // location `foo/index.html`; request `foo`; redirect to `foo/`
  it('append trailing slash', () => {
    return Promise.using(prepareServer(), app => request(app).get('/foo')
      .expect(301, 'Redirecting')
      .expect('Location', '/foo/'));
  });

  // location `bar/baz.html`; request `bar/baz/`; redirect to `bar/baz`
  it('redirects to valid path if available', () => {
    return Promise.using(prepareServer(), app => request(app).get('/bar/baz/')
      .expect(301, 'Redirecting')
      .expect('Location', '/bar/baz'));
  });

  it('trailing_html (default) - no redirect', () => {
    return Promise.using(prepareServer(), app => request(app).get('/bar/baz.html')
      .expect(200)
      .expect('Content-Type', 'text/html'));
  });

  // location `bar/baz.html`; request `bar/baz.html`; redirect to `bar/baz`
  it('trailing_html (false) - redirect when available', () => {
    hexo.config.pretty_urls.trailing_html = false;

    return Promise.using(prepareServer(), app => request(app).get('/bar/baz.html')
      .expect(301, 'Redirecting')
      .expect('Location', '/bar/baz'));
  });

  // location `foo/index.html`; request `foo/index.html`; redirect to `foo/`
  it('trailing_index (default) - no redirect', () => {

    return Promise.using(prepareServer(), app => request(app).get('/foo/index.html')
      .expect(200)
      .expect('Content-Type', 'text/html'));
  });

  // location `foo/index.html`; request `foo/index.html`; redirect to `foo/`
  it('trailing_index (false) - redirect when available', () => {
    hexo.config.pretty_urls.trailing_index = false;

    return Promise.using(prepareServer(), app => request(app).get('/foo/index.html')
      .expect(301, 'Redirecting')
      .expect('Location', '/foo/'));
  });

  it('don\'t append trailing slash if URL has a extension name', () => Promise.using(prepareServer(), app => request(app).get('/bar.txt')
    .expect(404)));

  it('only send headers on HEAD request', () => Promise.using(prepareServer(), app => request(app).head('/')
    .expect(200, undefined)));

  it('redirect to root URL if root is not `/`', () => {
    hexo.config.root = '/test/';

    return Promise.using(prepareServer(), app => request(app).get('/')
      .expect('Location', '/test/')
      .expect(302, 'Redirecting'));
  });

  it('display localhost instead of 0.0.0.0', () => {
    const spy = sinon.spy();
    const stub = sinon.stub(hexo.log, 'info');
    stub.callsFake(spy);

    return Promise.using(prepareServer(), app => {
      spy.args[1][1].should.contain('localhost');
    }).finally(() => {
      stub.restore();
    });
  });

  it('display localhost instead of [::]', () => {
    const spy = sinon.spy();
    const stub = sinon.stub(hexo.log, 'info');
    stub.callsFake(spy);

    return Promise.using(prepareServer({ip: '::'}), app => {
      spy.args[1][1].should.contain('localhost');
    }).finally(() => {
      stub.restore();
    });
  });
});
