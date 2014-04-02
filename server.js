
/**
 * Module dependencies
 */

var express  = require('express'),
	http     = require('http'),
	path     = require('path'),
	db       = require('./model/db'),
	mongoose = require('mongoose'),
	config   = require('./oauth2.js'),
	passport = require('passport'),
	GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var app = module.exports = express();

// Use moment for keeping track of times
app.locals.moment = require('moment');
app.locals.production = app.get('env') === 'production';

// Set the feedback widget ID based on whether we are in dev or production
app.locals.webengageID = app.get('env') === 'production' ? 'aa131322' : '~47b66aaa';

// Load models to register their schemas
var user = require( './model/user' ),
	database = require( './model/datasets' ),
	domains = require( './model/domains' ),
	ppis = require( './model/ppis' );

/**
 * Configuration
 */
// passport
// Serialize/Deserialize the user
var User = mongoose.model( 'User' );
passport.serializeUser(function(user, done) {
 	done(null, user.googleId);
});

passport.deserializeUser(function(id, done) {
 User.findOne({ googleId: id}, function(err, user){
     if(!err) done(null, user);
     else done(err, null)
 })
});

// development only
if (app.get('env') === 'development') {
  app.use(express.errorHandler());
  app.set('site url', 'http://localhost:8000/')
}

// production only
if (app.get('env') === 'production') {
  // TODO
  app.set('site url', 'http://biotools.cs.brown.edu/')
};

// config passport to use Google OAuth2
passport.use(new GoogleStrategy({
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: app.get('site url') + config.google.callbackURLSuffix
  },
  function(token, tokenSecret, profile, done) {
    User.findOne({ googleId: profile.id }, function (err, user) {
    	if (err) console.log( err );
    	if (!user) var user = new User();

    	// Store the user's full name, and his/her first email
		user.name     = profile.name.givenName + " " + profile.name.familyName;
		user.email    = profile.emails[0].value;
		user.googleId = profile.id;

		// Save/Update the user
		user.save(function(err){
			if (err) done(err, null);
			else done(err, user);
		});
    });
  }
));

// all environments
app.set('port', process.env.PORT || 8000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.compress());
app.use(express.logger('dev'));
app.use(express.cookieParser());
app.use(express.cookieSession({
	secret: 'gd3_for_president!',
	cookie: { maxAge: 60 * 60 * 1000 * 24 } // store for three days
}));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

/**
 * Routes
 */
 var routes = require( './routes/router' );

// Index page and query handler
app.get('/', routes.index);
app.post('/', routes.queryhandler)

// gd3 view
app.get('/view', routes.view)
app.get('/partials/:name', routes.partials);
app.get('/data/bundle', routes.viewData)
app.get('/query-error', routes.queryError)

// Data-/gene set uploads
app.post('/upload/geneset', routes.uploadGeneset)
app.get('/upload', ensureAuthenticated, routes.upload)
app.post('/upload/dataset', ensureAuthenticated, routes.uploadDataset)
app.get('/delete/dataset', ensureAuthenticated, routes.deleteDataset)


// more information
app.get('/terms', routes.terms)
app.get('/contact', routes.contact)
app.get('/support', routes.support)
app.get('/privacy', routes.privacy)
app.get('/acknowledgements', routes.acknowledgements)

// set up the authentication routes
app.get('/login', routes.login);
app.get('/logout', routes.logout);
app.get('/account', ensureAuthenticated, routes.account);

app.get('/auth/google',
	passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/userinfo.profile',
                                            'https://www.googleapis.com/auth/userinfo.email'] }),
	function(req, res){});

app.get('/auth/google/callback',
	passport.authenticate('google', { failureRedirect: '/' }), function(req, res) {
		res.redirect('/account');
	}
);

// Set up SEO routes
app.get('/google6c3c5c73e7e145cc.html', function(req, res) {
    res.sendfile('seo/google6c3c5c73e7e145cc.html');
});
app.get('/BingSiteAuth.xml', function(req, res) {
    res.sendfile('seo/BingSiteAuth.xml');
});
app.get('/sitemap.xml', function(req, res) {
    res.sendfile('seo/sitemap.xml');
});


// redirect all others to the index (HTML5 history)
//app.get('*', routes.index);

// Function that tests authentications
function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) { return next(); }
	res.redirect('/login')
}

/**
 * Start Server
 */

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
