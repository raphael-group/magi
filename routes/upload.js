// Load required modules
var Dataset  = require( "../model/datasets" ),
	formidable = require('formidable'),
	fs = require('fs'),
	path = require('path');

// Loads form for users to upload datasets
exports.upload  = function upload(req, res){
	res.render('upload', {user: req.user});
}

// Parse the user's dataset upload
exports.uploadDataset = function uploadDataset(req, res){
	// Load the posted form
	var form = new formidable.IncomingForm({
		uploadDir: path.normalize(__dirname + '/../tmp'),
		keepExtensions: true
    });

    form.parse(req, function(err, fields, files) {
    	// Parse the form variables into shorter handles
    	var dataset = fields.dataset,
    		group_name = fields.groupName,
    		color = fields.color;

    	if (files.SNVs) snv_file = files.SNVs.path;
    	else snv_file = null;

    	if (files.CNAs) cna_file = files.CNAs.path;
    	else cna_file = null;

    	if (files.aberrations) aberration_file = files.aberrations.path;
    	else aberration_file = null;

    	if (files.testedSamples) samples_file = files.testedSamples.path;
    	else samples_file = null;

    	// Pass the files to the parsers
		Dataset.addDatasetFromFile(dataset, group_name, samples_file, snv_file, cna_file, aberration_file, false, color, req.user._id)
			.then(function(){
		    	// Once the parsers have finished, destroy the tmp files
				if (snv_file) fs.unlinkSync( snv_file );
				if (cna_file) fs.unlinkSync( cna_file );
				if (samples_file) fs.unlinkSync( samples_file );

				res.send({ status: "Data uploaded successfully! Return to the <a href='/'>home page</a> to view your dataset." });
			})
			.fail(function(){
				res.send({ status: "Data could not be parsed." });
			});
	});
}


// Remove the user's given dataset and redirect back to the account
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
