// Load required modules
var formidable = require('formidable'),
	fs = require('fs'),
	path = require('path'),
	Dataset  = require( "../model/datasets" );

// Renders home page
exports.index = function index(req, res){
	console.log('/index')
	Dataset.datasetGroups({is_standard: true}, function(err, standardGroups){
		// Throw error (if necessary)
		if (err) throw new Error(err);

		// Append the groupClass standard to each group
		standardGroups.forEach(function(g){ g.groupClass = "public"; })
		standardGroups.forEach(function(g){
			g.dbs = g.dbs.sort(function(a, b){ return a.title > b.title ? 1 : -1; });
		});

		// Load the user's datasets (if necessary)
		if (req.user){
			Dataset.datasetGroups({user_id: req.user._id}, function(err, userGroups){
				// Throw error (if necessary)
				if (err) throw new Error(err);

				// Append the groupClass standard to each group
				userGroups.forEach(function(g){ g.groupClass = "private"; });
				userGroups.forEach(function(g){
					g.dbs = g.dbs.sort(function(a, b){ return a.title > b.title ? 1 : -1; });
				});

				res.render('index', { user: req.user, groups: standardGroups.concat(userGroups) });
			});
		}
		else{
			res.render('index', { user: req.user, groups: standardGroups });
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

	res.redirect('/view?' + query)

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
