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
	console.log(req.user)
	Dataset.datasetGroups({is_public: true}, function(err, standardGroups){
		// Throw error (if necessary)
		if (err) throw new Error(err);

		///////////////////////////////////////////////////////////////////////
		// Process the groups of datasets and assign each dataset a unique
		// checkbox ID

		// Store the checkbox IDs of all and the public datasets by group
		var datasetToCheckboxes = { all: [] },
			datasetDeselect = [],
			samples = [];

		function toCheckboxValue(_id, scope, title, gName){ return ["db", scope, gName, title, _id].join(" "); }
		function initGroup(groups, scope){
			// Assign each group a scope (public/private), and sort the dbs
			groups.forEach(function(g){ g.groupClass = scope; })
			groups.forEach(function(g){
				g.dbs = g.dbs.sort(function(a, b){ return a.title > b.title ? 1 : -1; });
			});

			// Assign each dataset a checkbox ID
			groups.forEach(function(g){
				var groupName = g.name == "" ? "other" : g.name.toLowerCase();
				if (scope == "public") datasetToCheckboxes[groupName] = [];
				g.dbs.forEach(function(db){
					datasetToCheckboxes.all.push( db.checkboxValue = toCheckboxValue(db._id, scope, db.title, groupName) );
					if (scope == "public"){
						datasetToCheckboxes[groupName].push( db.checkboxValue );
						if (groupName == "tcga pan-cancer" && db.title == "GBM"){
							datasetToCheckboxes.gbm = [ db.checkboxValue ];
						} else if (groupName == "tcga publications"){
							datasetDeselect.push( db.checkboxValue );
						}
					}

					// Record each of the samples (required for sample search)
					db.samples.forEach(function(s){
						samples.push( {sample: s, cancer: db.title, groupName: g.name == "" ? "Other" : g.name })
					});
				})
			});
		}

		initGroup( standardGroups, 'public' )


		var viewData = {
			user: req.user,
			groups: standardGroups,
			datasetToCheckboxes: datasetToCheckboxes,
			recentQueries: [],
			datasetDeselect: datasetDeselect,
			samples: samples
		};
		// Load the user's datasets (if necessary)
		if (req.user){
			Dataset.datasetGroups({user_id: req.user._id}, function(err, userGroups){
				// Throw error (if necessary)
				if (err) throw new Error(err);

				// Append the groupClass standard to each group
				initGroup( userGroups, 'private' );
				viewData.groups = viewData.groups.concat(userGroups);

				// Load the user's recent queries
				var User = Database.magi.model( 'User' );
				User.findById(req.user._id, function(err, user){
					if (err) throw new Error(err);
					viewData.recentQueries = user.queries ? user.queries : [];
					res.render('index', viewData);
				});

			});
		}
		else{
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
		var arr = n.split(" ");
		return arr[arr.length - 1];
	});

	// Split genes while ignoring blank lines
	genes = genes.replace(/(\r\n|\n|\r)/gm, "\n");
	genes = genes.split("\n").filter(function(g){ return g != ""; }).join(",");

	// Make query string
	var querystring = require( 'querystring' ),
			query = querystring.stringify( {genes: genes, datasets: datasets.join(","), showDuplicates: showDuplicates == "on" } );

	// If there is a user, save the query to the most recent queries for the user
	if (req.user){
		var User = Database.magi.model( 'User' );
		User.findById(req.user._id, function(err, user){
			if (err) throw new Error(err);

			// Add the newest query, and then make sure the length is at most ten
			user.queries.splice(0, 0, { datasets: checkedDatasets, genes: genes.split(",") })
			user.queries = user.queries.slice(0, Math.min(10, user.queries.length));

			// Update the user
			user.markModified('queries');
			user.save(function(err){
				if (err) throw new Error(err);
				res.redirect('/view?' + query);
			});
		});
	}
	else{
		res.redirect('/view?' + query);
	}

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
