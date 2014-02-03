// Load the individual routes
var about = require( './about' ),
	auth = require( './auth' ),
	bundler = require( './bundler' ),
	index = require( './index' ),
	upload = require( './upload' ),
	view = require( './view' );

//*  Export the routes in each subrouter *//

// About
exports.terms   = about.terms;
exports.contact = about.contact;
exports.support = about.support;

// Authentication routes
exports.account = auth.account;
exports.login   = auth.login;
exports.logout  = auth.logout;

// Bundler routes
exports.viewData = bundler.viewData;

// Index routes
exports.index = index.index;
exports.queryhandler = index.queryhandler;
exports.uploadGeneset = index.uploadGeneset;

// Uploading data routes
exports.upload = upload.upload;
exports.uploadDataset = upload.uploadDataset;
exports.deleteDataset = upload.deleteDataset;

// Routes for the main view
exports.view       = view.view;
exports.partials   = view.partials;
exports.queryError = view.queryError;