// Load required modules
var mongoose = require('mongoose'),
	formidable = require('formidable'),
	fs = require('fs'),
	path = require('path'),
	Dataset  = require( "../model/datasets" ),
	Database = require('../model/db');

// Renders home page
exports.index = function index(req, res){
	console.log('/index')

	// Load all public datasets plus the user's datasets
	if (req.user){
		var query = {$or: [{is_public: true}, {user_id: req.user._id }]}
	} else{
		var query = {is_public: true};
	}

	Dataset.datasetGroups(query, function(err, groups, samples){
		// Throw error (if necessary)
		if (err) throw new Error(err);

		// Store the checkbox IDs of all and the public datasets by group
		var userGroups = req.user ? groups.filter(function(g){ return (g.user_id + "") == (req.user._id + ""); }) : [],
			publicGroups = groups.filter(function(g){ return g.is_public; }),
			publicGroupToDatasets = {},
			checkboxes = [];

		publicGroups.forEach(function(g){
			publicGroupToDatasets[g.name.toLowerCase()] = {};
			checkboxes = checkboxes.concat( g.datasets.map(function(d){ return d._id; }))
			g.datasets.forEach(function(d){
				publicGroupToDatasets[g.name.toLowerCase()][d.title.toLowerCase()] = d._id;
			});
		});

		userGroups.forEach(function(g){
			checkboxes = checkboxes.concat( g.datasets.map(function(d){ return d._id; }))
		});

		// Package the data together and render the page
		var viewData = {
			user: req.user,
			checkboxes: checkboxes,
			groups: groups,
			publicGroupToDatasets: publicGroupToDatasets,
			recentQueries: [],
			samples: samples,
			skip_requery: true
		};

		if (req.user){
			// Load the user's recent queries
			var User = Database.magi.model( 'User' );
			User.findById(req.user._id, function(err, user){
				if (err) throw new Error(err);
				viewData.recentQueries = user.queries ? user.queries : [];
				res.render('index', viewData);
			});
		} else{
			res.render('index', viewData);
		}
	});
}

// Parse a user's POST to properly format the view
exports.queryhandler = function queryhandler(req, res){
	// Parse params
	var genes = req.body.genes || "",
		showDuplicates = req.body.showDuplicates || "";

	/* Extract datasets */
	// Dataset checkboxes are prepended with 'db' to ensure no starts their
	// dataset name with a non-letter (which would break HTML rules)
	if (req.body.multiselect instanceof Array){
		var checkedDatasets = req.body.multiselect.filter(function(n){
			return n.substr(0, 2) == 'db'
		});
	}
	// Otherwise we have a single dataset stored as a string
	else{
		var checkedDatasets = [ req.body.multiselect ]
	}

	// Extract the true dataset title from the names
	var datasets = checkedDatasets.map(function(n){
		var arr = n.split("-");
		return arr[arr.length - 1];
	});

	// Split genes while ignoring blank lines
	genes = genes.replace(/(\r\n|\n|\r)/gm, "\n");
	genes = genes.split("\n").filter(function(g){ return g != ""; }).join(",");

	// Make query string
	var querystring = require( 'querystring' ),
			query = querystring.stringify( {genes: genes, datasets: datasets.join(","), showDuplicates: showDuplicates == "on" } );

	// If there is a user, save the query to the most recent queries for the user
	res.redirect('/view?' + query);
}

exports.saveQuery = function saveQuery(user, datasets, genes, callback){
	var User = Database.magi.model( 'User' );
	User.findById(user._id, function(err, user){
		if (err) throw new Error(err);

		// Add the newest query, and then make sure the length is at most ten
		user.queries.splice(0, 0, { datasets: datasets, genes: genes })
		user.queries = user.queries.slice(0, Math.min(10, user.queries.length));

		// Update the user
		user.markModified('queries');
		user.save(callback);
	});
}

// Performs client-side file upload so users can upload a list of genes
// (instead of entering them manually)
exports.uploadGeneset = function uploadGeneset(req, res){
	console.log('/upload/geneset')

	// parse a file upload
	var form = new formidable.IncomingForm({
		uploadDir: path.normalize(__dirname + '/../tmp'),
		keepExtensions: true
    });

    form.parse(req, function(err, fields, files) {
		// The next function call, and the require of 'fs' above, are the only
		// changes I made from the sample code on the formidable github
		//
		// This simply reads the file from the tempfile path and echoes back
		// the contents to the response.
		fs.readFile(files.geneSet.path, 'utf-8', function (err, genes) {
			if (err) console.log(err)
			fs.unlink(files.geneSet.path, function (err) {
				if (err) throw err;
				res.send({ genes: genes });
			});
		});
	});
}
