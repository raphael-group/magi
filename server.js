
/**
 * Module dependencies
 */

var express  = require('express')
  , http     = require('http')
  , path     = require('path')
  , db = require('./model/db');

var app = module.exports = express();


/**
 * Configuration
 */


// all environments
app.set('port', process.env.PORT || 8000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.compress());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);

// development only
if (app.get('env') === 'development') {
  app.use(express.errorHandler());
}

// production only
if (app.get('env') === 'production') {
  // TODO
};



/**
 * Routes
 */
 var routes = require( './routes/index' );

app.get('/', routes.index);
app.post('/', routes.queryhandler)
app.post('/upload/geneset', routes.uploadGeneset)
app.get('/view', routes.view)
app.get('/data/bundle', routes.bundler.viewData)
app.get('/partials/:name', routes.partials);

// redirect all others to the index (HTML5 history)
app.get('*', routes.index);


/**
 * Start Server
 */

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
