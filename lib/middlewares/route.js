'use strict';

// arguments:
// `--cache [bytes]` enables the cache, the optinal bytes are the size of the cache (default `10485760` 10MB)
// `--cache-filter [regex]` set a filter of which files should be cached (default `\.(css|js)$` for .css an .js)

var pathFn = require('path');
var mime = require('mime');
var LRU = require('lru-cache');
var stream = require('stream');

module.exports = function(app) {
  var config = this.config;
  var args = this.env.args || {};
  var root = config.root;
  var route = this.route;

  if (args.s || args.static) return;

  var cache = new LRU({
    max: (args.cache === true) ? 10485760 : 0,
    length: function (value, key) {
      return value.byteLength;
    }
  });
  var cacheFilterRegExp = new RegExp(args.cacheFilter || '\.(css|js)$');

  // Reset cache if source-files are modified
  this.addListener('generateAfter', function() {
    cache.reset();
  });

  app.use(root, function(req, res, next) {
    var method = req.method;
    if (method !== 'GET' && method !== 'HEAD') return next();

    var url = route.format(decodeURIComponent(req.url));
    var data;
    if (args.cache && cache.has(url)) {
      data = cache.get(url);
    } else {
      data = route.get(url);
    }
    var extname = pathFn.extname(url);

    // When the URL is `foo/index.html` but users access `foo`, redirect to `foo/`.
    if (!data) {
      if (extname) return next();

      url = encodeURI(url);
      res.statusCode = 302;
      res.setHeader('Location', root + url + '/');
      res.end('Redirecting');
      return;
    }

    res.setHeader('Content-Type', extname ? mime.lookup(extname) : 'application/octet-stream');

    if (method === 'GET') {
      if (args.cache && url.search(cacheFilterRegExp) !== -1) {
        if (cache.has(url)) {
          // load from cache
          var cacheStream = new stream.Readable();
          cacheStream.push(cache.get(url));
          cacheStream.push(null);
          cacheStream.pipe(res).on('error', next);
        } else {
          // save to cache
          var cacheStream = stream.PassThrough();
          cacheStream.on('data', function(data) {
            if (!cache.has(url)) {
              cache.set(url, Buffer.from(data));
            } else {
              cache.set(url, cache.get(url).data.concat(data) );
            }
          });

          data.pipe(cacheStream).pipe(res).on('error', next);
        }
      } else {
        // stream from hexo
        data.pipe(res).on('error', next);
      }
    } else {
      res.end();
    }
  });
};
