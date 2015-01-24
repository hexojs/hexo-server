var browserSync = require('browser-sync');
module.exports = function(app){

  var bs = browserSync.init([], {
    watchOptions: {
      debounceDelay: 1000
    }
  });

  app.use(require('connect-browser-sync')(bs));
};
