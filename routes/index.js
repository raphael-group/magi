// Main routes
var dataset  = require( "../model/datasets" )
, formidable = require('formidable')
, fs = require('fs')
, path = require('path');

exports.index = function index(req, res){
	dataset.datasetGroups(function(err, groups){
		// Throw error (if necessary)
		if (err) throw new Error(err);

		// Render index page
		res.render('index', { groups: groups });

	});
}

exports.uploadGeneset = function uploadGeneset(req, res){
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

exports.queryhandler = function queryhandler(req, res){
	// Parse params
	console.log(req)
	var genes = req.body.genes || "";

	/* Extract datasets */
	// Dataset checkboxes are prepended with db- to ensure no starts their
	// dataset name with a non-letter (which would break HTML rules)
	var checkedDatasets = Object.keys( req.body).filter(function(n){
		return n.substr(0, 3) == 'db-'
	});

	// Extract the true dataset title from the names
	var datasets = checkedDatasets.map(function(n){return n.split("db-")[1]; });

	// Split genes up
	genes = genes.replace(/(\r\n|\n|\r)/gm, "-");

	// Make query string
	var querystring = require( 'querystring' )
	, query = querystring.stringify( {genes: genes, datasets: datasets.join("-") } )

	// Redirect to view
    res.redirect('/view#!/?' + query);

}

exports.view  = function view(req, res){
	res.render('view');
}

exports.partials =  function partials(req, res){
	console.log( req.params.name );
	var name = req.params.name;
	res.render('partials/' + name);
}

// Subroutes
exports.bundler = require('./bundler');

