// Main routes
var Dataset  = require( "../model/datasets" )
, formidable = require('formidable')
, fs = require('fs')
, path = require('path');

exports.index = function index(req, res){
	console.log('/index')
	Dataset.datasetGroups({is_standard: true}, function(err, standardGroups){
		// Throw error (if necessary)
		if (err) throw new Error(err);

		// Append the groupClass standard to each group
		standardGroups.forEach(function(g){ g.groupClass = "standard"; })

		// Load the user's datasets (if necessary)
		if (req.user){
			Dataset.datasetGroups({user_id: req.user._id}, function(err, userGroups){
				// Throw error (if necessary)
				if (err) throw new Error(err);
				
				// Append the groupClass standard to each group
				userGroups.forEach(function(g){ g.groupClass = "user"; });
				
				res.render('index', { user: req.user, groups: standardGroups.concat(userGroups) });
			});
		}
		else{
			res.render('index', { user: req.user, groups: standardGroups });
		}
	});
}

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

exports.queryhandler = function queryhandler(req, res){
	// Parse params
	var genes = req.body.genes || "";

	/* Extract datasets */
	// Dataset checkboxes are prepended with db- to ensure no starts their
	// dataset name with a non-letter (which would break HTML rules)
	var checkedDatasets = Object.keys( req.body ).filter(function(n){
		return n.substr(0, 3) == 'db-'
	});

	// Extract the true dataset title from the names
	var datasets = checkedDatasets.map(function(n){
		return n.split("db-")[1];
	});

	// Split genes up
	genes = genes.replace(/(\r\n|\n|\r)/gm, "-");

	// Make query string
	var querystring = require( 'querystring' )
	, query = querystring.stringify( {genes: genes, datasets: datasets.join("-") } );

	res.redirect('/view#!/?' + query)

}

exports.view  = function view(req, res){
	console.log('view')
	res.render('view', {user: req.user});
}


exports.queryError  = function queryError(req, res){
	console.log('query-error')
	res.render('query-error', {user: req.user});
}

exports.partials =  function partials(req, res){
	console.log( req.params.name );
	var name = req.params.name;
	res.render('partials/' + name);
}

// Uploading datasets
exports.upload  = function upload(req, res){
	console.log('upload')
	res.render('upload', {user: req.user});
}


exports.deleteDataset = function deleteDataset(req, res){
	console.log('/delete/dataset')

	// Parse params
	console.log(req.query)
	var dataset_id = req.query.did || "";

	// Construct the query
	var query = {user_id: req.user._id, _id: dataset_id };

	Dataset.removeDataset(query, function(err){
		if (err){
			throw new Error(err);
		}
		res.redirect('/account')
	})


}

exports.uploadDataset = function uploadDataset(req, res){
	// parse a file upload
	var form = new formidable.IncomingForm({
		uploadDir: path.normalize(__dirname + '/../tmp'),
		keepExtensions: true
    });

    form.parse(req, function(err, fields, files) {
    	// Parse the form variables into shorter handles
    	var snv_file = files.SNVs.path,
    		samples_file = files.testedSamples.path,
    		dataset = fields.dataset,
    		group_name = fields.groupName;

    	// Pass the files to the parsers
		Dataset.addSNVsFromFile(dataset, group_name, samples_file, snv_file, false, req.user._id)
			.then(function(){
		    	// Once the parsers have finished, destroy the tmp files
				fs.unlink(snv_file, function (err) {
					if (err) throw err;
					fs.unlink(samples_file, function (err) {
						if (err) throw err;
						res.send({ status: "Data uploaded successfully! Return to the <a href='/'>home page</a> to query your dataset." });
					});
				});
			})
			.fail(function(){
				res.send({ status: "Data could not be parsed." });
			});
	});
}

// Subroutes
exports.bundler = require('./bundler');

