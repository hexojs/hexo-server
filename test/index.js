'use strict';

const chai = require('chai');
chai.use(require('chai-as-promised'));
chai.should();
const Hexo = require('hexo');
const request = require('supertest');
const { join } = require('path');
const fs = require('hexo-fs');
const Promise = require('bluebird');
const uuidv4 = require('uuid/v4');
const sinon = require('sinon');

describe('server', () => {
  const hexo = new Hexo(join(__dirname, 'server_test'), {silent: true});
  const themeDir = join(hexo.base_dir, 'themes', 'test');

  const server = require('../lib/server').bind(hexo);

  // Default config
  hexo.config.server = {
    port: 4000,
    log: false,
    ip: '0.0.0.0',
    compress: false,
    header: true
  };

  // Register fake generator
  hexo.extend.generator.register('test', () => [
    {path: '', data: 'index'},
    {path: 'foo/', data: 'foo'},
    {path: 'bar.jpg', data: 'bar'}
  ]);

  // Register middlewares
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
    .expect(200, 'index')
    .end()));

  it('Remove X-Powered-By header if options.header is false', () => {
    hexo.config.server.header = false;

    return Promise.using(prepareServer(), app => request(app).get('/')
      .expect(200)
      .end()
      .then(res => {
        res.headers.should.not.have.property('x-powered-by');
      })).finally(() => {
      hexo.config.server.header = true;
    });
  });

  it('Content-Type header', () => Promise.using(prepareServer(), app => request(app).get('/bar.jpg')
    .expect('Content-Type', 'image/jpeg')
    .expect(200)
    .end()));

  it('Enable compression if options.compress is true', () => {
    hexo.config.server.compress = true;

    return Promise.using(prepareServer(), app => request(app).get('/')
      .expect('Content-Encoding', 'gzip')
      .end()).finally(() => {
      hexo.config.server.compress = false;
    });
  });

  it('Disable compression if options.compress is false', () => Promise.using(prepareServer(), app => request(app).get('/')
    .end()
    .then(res => {
      res.headers.should.not.have.property('Content-Encoding');
    })));

  it('static asset', () => {
    const path = join(hexo.public_dir, 'test.html');
    const content = 'test html';

    return fs.writeFile(path, content).then(() => Promise.using(prepareServer(), app => request(app).get('/test.html')
      .expect('Content-Type', 'text/html; charset=UTF-8')
      .expect(200, content)
      .end())).finally(() => fs.unlink(path));
  });

  it('invalid port', () => server({port: -100}).should.to.rejectedWith(RangeError, 'Port number -100 is invalid. Try a number between 1 and 65535.'));

  it('invalid port > 65535', () => server({port: 65536}).should.to.rejectedWith(RangeError, 'Port number 65536 is invalid. Try a number between 1 and 65535.'));

  it('change port setting', () => Promise.using(prepareServer({port: 5000}), app => request(app).get('/')
    .expect(200, 'index')
    .end()));

  it('check port before starting', () => Promise.using(prepareServer(), app => server({}).should.rejected.and.eventually.have.property('code', 'EADDRINUSE')));

  it('change ip setting', () => server({ip: '1.2.3.4'}).should.rejected.and.eventually.have.property('code', 'EADDRNOTAVAIL'));

  it('append trailing slash', () => Promise.using(prepareServer(), app => request(app).get('/foo')
    .expect('Location', '/foo/')
    .expect(302, 'Redirecting')
    .end()));

  it('don\'t append trailing slash if URL has a extension name', () => Promise.using(prepareServer(), app => request(app).get('/bar.txt')
    .expect(404)
    .end()));

  it('only send headers on HEAD request', () => Promise.using(prepareServer(), app => request(app).head('/')
    .expect(200, '')
    .end()));

  it('redirect to root URL if root is not `/`', () => {
    hexo.config.root = '/test/';

    return Promise.using(prepareServer(), app => request(app).get('/')
      .expect('Location', '/test/')
      .expect(302, 'Redirecting')
      .end()).finally(() => {
      hexo.config.root = '/';
    });
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
