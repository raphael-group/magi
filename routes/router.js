// Load the individual routes
var about = require( './about' ),
	auth = require( './auth' ),
	index = require( './index' ),
	upload = require( './upload' ),
	view = require( './view' ),
	datasets = require('./datasets'),
	annotations = require('./annotations'),
  log = require('./log'),
  share = require('./share');

//*  Export the routes in each subrouter *//

// About
exports.terms   = about.terms;
exports.contact = about.contact;
exports.support = about.support;
exports.privacy = about.privacy;
exports.acknowledgements = about.acknowledgements;
exports.cancers = about.cancers;

// Authentication routes
exports.account = auth.account;
exports.login  = auth.login;
exports.logout  = auth.logout;
exports.user = {update: auth.update};

// Index routes
exports.index = index.index;
exports.queryhandler = index.queryhandler;
exports.uploadGeneset = index.uploadGeneset;

// Uploading data routes
exports.upload = upload.upload;
exports.uploadDataset = upload.uploadDataset;
exports.deleteDataset = upload.deleteDataset;
exports.uploadCancer = upload.uploadCancer;

// Routes for the main view
exports.view       = view.view;
exports.queryError = view.queryError;

// Datasets
exports.datasets = {}
exports.datasets.index = datasets.index;
exports.datasets.view = datasets.view

// Annotations
exports.annotations = { save: {}}
exports.annotations.gene = annotations.gene;
exports.annotations.cancer = annotations.cancer;
exports.annotations.save.mutation = annotations.saveMutation;
exports.annotations.save.ppi = annotations.savePPI;
exports.annotations.ppiVote = annotations.ppiVote;
exports.annotations.ppiComment = annotations.ppiComment;
exports.annotations.mutationVote = annotations.mutationVote;

// Share link
exports.saveShareURL = share.saveShareURL;

// Session logs
exports.saveLog = log.saveLog;
exports.startLog = log.startLog;
exports.extendLog = log.extendLog;
exports.isLoggingEnabled = log.isLoggingEnabled;
exports.logConsent = log.logConsent;
exports.userGaveConsent = log.userGaveConsent;