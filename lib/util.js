var mime = require('mime');

exports.redirect = function(res, path){
  if (res == null) throw new Error('res is required.');
  if (typeof path !== 'string') throw new TypeError('path must be a string.');

  res.statusCode = 302;
  res.setHeader('Location', path);
  res.end('Redirecting to ' + path);
};

exports.contentType = function(res, type){
  if (res == null) throw new Error('res is required.');
  type = type || 'application/octet-stream';

  res.setHeader('Content-Type', ~type.indexOf('/') ? type : mime.lookup(type));
};