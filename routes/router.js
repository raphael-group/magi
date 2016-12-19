// Load the individual routes
var about = require( './about' ),
	auth = require( './auth' ),
	colorPicking = require('./colorPicking'),
	index = require( './index' ),
	upload = require( './upload' ),
	view = require( './view' ),
	sampleView = require( './sampleView' ),
	enrichments = require( './enrichments' ),
	datasets = require('./datasets'),
	annotations = require('./annotations'),
  log = require('./log'),
  share = require('./share'),
  requery = require('./requery'),
	save = require('./save');

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

// Colorgorical color picking routes
exports.makePalette = colorPicking.makePalette;

// Index routes
exports.index = index.index;
exports.queryhandler = index.queryhandler;
exports.uploadGeneset = index.uploadGeneset;

// Uploading data routes
exports.upload = upload.upload;
exports.uploadDataset = upload.uploadDataset;
exports.deleteDataset = upload.deleteDataset;
exports.uploadManifest = upload.uploadManifest;
exports.uploadCancer = upload.uploadCancer;
exports.formatSNVs = upload.formatSNVs;
exports.formatCNAs = upload.formatCNAs;
exports.formatAberrations = upload.formatAberrations;
exports.formatDataMatrices = upload.formatDataMatrices;
exports.formatSampleAnnotations = upload.formatSampleAnnotations;
exports.formatAnnotationColors = upload.formatAnnotationColors;

// Routes for the main view
exports.view       = view.view;
exports.queryError = view.queryError;

// Routes for the sample view
exports.sampleView = sampleView.sampleView;

// Enrichment statistics routes
exports.enrichments = enrichments.index;
exports.enrichmentStats = enrichments.stats;

// Datasets
exports.datasets = {};
exports.datasets.index = datasets.index;
exports.datasets.view = datasets.view;
exports.datasets.manifests = datasets.manifests;

// Save
exports.savefigure = save.figure;

// Share link
exports.saveShareURL = share.saveShareURL;

// Session logs
exports.saveLog = log.saveLog;
exports.startLog = log.startLog;
exports.extendLog = log.extendLog;
exports.isLoggingEnabled = log.isLoggingEnabled;
exports.logConsent = log.logConsent;
exports.userGaveConsent = log.userGaveConsent;


// Requery parameters
exports.queryGetDatasetsAndGenes = requery.queryGetDatasetsAndGenes;
// Get session variables for queries
exports.getSessionLatestQuery = requery.getSessionLatestQuery;

// test routes for annotations
exports.annotations = {};
exports.annotations.gene = annotations.gene;
exports.annotations.cancer = annotations.cancer;
