'use strict';

var url = require('url');
var format = require('util').format;
var cookieParser = require('cookie-parser');
var session = require('express-session')
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

function configPassport(addr, allowedDomain) {

// used to serialize the user for the session
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

// used to deserialize the user
  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });

// =========================================================================
// GOOGLE ==================================================================
// =========================================================================
  passport.use(new GoogleStrategy({
    clientID      : process.env.GOOGLE_CLIENT_ID,
    clientSecret  : process.env.GOOGLE_CLIENT_SECRET,
    callbackURL   : addr + 'auth/google/callback',
  },
  function(token, refreshToken, profile, done) {
    // make the code asynchronous
    // User.findOne won't fire until we have all our data back from Google
    process.nextTick(function() {

      if (profile._json.domain === allowedDomain) {
        return done(null, profile);
      } else {
        return done(new Error("Invalid user domain"), null);
      }

    });
  }));
}


module.exports = function(app){

  var addr = process.env.SITE_ADDR || this.config.server.addr;

  var allowedDomain = process.env.OAUTH_ALLOWED_DOMAIN;
  // if the allowed domain isn't set, don't activate this middleware
  if (allowedDomain == null) {
    return;
  }

  configPassport(addr, allowedDomain);

  app.use(cookieParser()); // read cookies (needed for auth)
  app.use(session({
      secret: 'hexo secret tbd enhance',
      resave: false,
      saveUninitialized: false
  }));
  app.use(passport.initialize());
  app.use(passport.session()); // persistent login sessions

  app.use(function(req, res, next){

    // route for logging out
    // not really useful, as you will be redirected to /auth/google and immediately logged in again
    if (req.url === '/logout') {
      req.logout();
      res.statusCode = 302;
      res.setHeader('Location', addr);
      res.end('Redirecting');
      return;
    }

    // =====================================
    // GOOGLE ROUTES =======================
    // =====================================
    // send to google to do the authentication
    // profile gets us their basic information including their name
    // email gets their emails
    if (req.url === '/auth/google') {
        passport.authenticate('google', {
            scope : ['profile email']
        })(req, res, next);
        return;
    };

    // the callback after google has authenticated the user
    if (url.parse(req.url).pathname === '/auth/google/callback') {
      passport.authenticate('google', {
        successRedirect : '/',
        failureRedirect : '/auth/google'
      })(req, res, next);
        return;
    }

    if (req.isAuthenticated()) {
      return next();
    }

    res.statusCode = 302;
    res.setHeader('Location', addr + 'auth/google');
    res.end('Redirecting');
  });
};
