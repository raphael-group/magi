// Load required modules
var mongoose = require( 'mongoose' ),
	Dataset  = require( "../model/datasets" ),
	Database = require('../model/db'),
	formidable = require('formidable'),
	fs = require('fs'),
	Cancers  = require( "../model/cancers" ),
	path = require('path');

// Loads form for users to upload datasets
exports.upload  = function upload(req, res){
	console.log('upload')
	var Cancer = Database.magi.model( 'Cancer' );
	Cancer.find({}, function(err, cancers){
		if (err) throw new Error(err);
		else{
			cancers.sort(function(a, b){ return a.cancer > b.cancer ? 1 : -1; });
			var tcga_icgc_cancers = cancers.filter(function(d){ return d.is_standard; }),
				user_cancers = cancers.filter(function(d){ return !d.is_standard; });
			res.render('upload', {user: req.user, tcga_icgc_cancers: tcga_icgc_cancers, user_cancers: user_cancers });
		}
	});
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
    		cancer = fields.cancer,
    		color = fields.color;

    	if (files.cancerMapping) cancer_file = files.cancerMapping.path;
    	else cancer_file = null;

    	var cancer_input = cancer_file ? cancer_file : cancer;

    	if (files.SNVs) snv_file = files.SNVs.path;
    	else snv_file = null;

    	if (files.CNAs) cna_file = files.CNAs.path;
    	else cna_file = null;

    	if (files.aberrations) aberration_file = files.aberrations.path;
    	else aberration_file = null;

    	if (files.testedSamples) samples_file = files.testedSamples.path;
    	else samples_file = null;

    	if (files.DataMatrix) data_matrix_file = files.DataMatrix.path;
    	else data_matrix_file = null;

    	// Pass the files to the parsers
		Dataset.addDatasetFromFile(dataset, group_name, samples_file, snv_file, cna_file, aberration_file,
								   data_matrix_file, cancer_input, false, color, req.user._id)
			.then(function(){
		    	// Once the parsers have finished, destroy the tmp files
				if (snv_file) fs.unlinkSync( snv_file );
				if (cna_file) fs.unlinkSync( cna_file );
				if (samples_file) fs.unlinkSync( samples_file );
				if (aberration_file) fs.unlinkSync( aberration_file );
				if (cancer_file) fs.unlinkSync(cancer_file);
				if (data_matrix_file) fs.unlinkSync(data_matrix_file);

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

// Parse the user's dataset upload
exports.uploadCancer = function uploadDataset(req, res){
	console.log('upload/cancer')
	var Cancer = Database.magi.model( 'Cancer' );

	// Load the posted form
	var name  = req.body.name,
		abbr  = req.body.abbr,
		color = req.body.color;

	// Create the cancer
	Cancer.create({name: name, abbr: abbr, color: color}, function(err, cancer){
		if (err) throw new Error(err);
		res.redirect("/cancers");
	});
}