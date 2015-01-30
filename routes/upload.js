// Load required modules
var mongoose = require( 'mongoose' ),
	Dataset  = require( "../model/datasets" ),
	Database = require('../model/db'),
	formidable = require('formidable'),
	fs = require('fs'),
	Cancers  = require( "../model/cancers" ),
	path = require('path');
	childProcess = require('child_process');

// must include the '.' otherwise string slicing will be off by one
var MAF_EXT = '.maf';
var MAF2TSV_PATH = '../public/scripts/maf2tsv.py';

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

	// given a path to a MAF file, call the converter script to create a TSV
	// and return the path to newly created TSV
	function convertMaf(path) {
		// cut off the MAF extension
		// this prefix will be used by the script to create a file
		// with name <outputPrefix>.tsv
		var outputPrefix = path.slice(0, -(MAF_EXT.length));
		args = ['--maf_file=' + path, 
				// TODO: how to choose which transcript db?
				'--transcript_db=' + 'refseq', // 'ensemble',
				'--output_prefix=', outputPrefix
			   ];

		convert = childProcess.execFile(MAF2TSV_PATH, function(err, stdout,
															   stderr) {
			if (err) throw new Error(err);

			console.log('Child Process STDOUT: ' + stdout);
			console.log('Child Process STDERR: ' + stderr);
		});

		// not sure if this is necessary since the callback has err
		convert.on('error', function(err) {
			console.log('Child processed error: ' + err);
		});

		convert.on('exit', function (code) {
			console.log('Child process exited with exit code '+code);
		});

		var paths = {'snvs' : outputPrefix + "-snvs.tsv",
					 'samples' : outputPrefix + "-samples.tsv"};
		console.log(paths);
		return paths;
	};

	form.parse(req, function(err, fields, files) {
		// Parse the form variables into shorter handles
		var dataset = fields.dataset,
			group_name = fields.groupName,
			cancer = fields.cancer,
			color = fields.color,
			data_matrix_name = fields.DataMatrixName;

		if (files.CancerMapping) cancer_file = files.CancerMapping.path;
		else cancer_file = null;

		var cancer_input = cancer_file ? cancer_file : cancer;

		if (files.SNVs) snv_file = files.SNVs.path;
		else snv_file = null;

		if (files.CNAs) cna_file = files.CNAs.path;
		else cna_file = null;

		if (files.Aberrations) aberration_file = files.Aberrations.path;
		else aberration_file = null;

		if (files.SampleAnnotations) samples_file = files.SampleAnnotations.path;
		else samples_file = null;

		if (files.AnnotationColors) annotation_colors_file = files.AnnotationColors.path;
		else annotation_colors_file = null;

		if (files.DataMatrix) data_matrix_file = files.DataMatrix.path;
		else data_matrix_file = null;

		// if the uploaded SNV file is a MAF file, convert it to TSV and 
		// change the path of the samples file to the samples TSV output by the
		// conversion script
		// TODO: is it correct to assume that if the SNV file is MAF, there 
		// is no samples file and that it's correct to overwrite the samples
		// path?
		if (snv_file && snv_file.slice(-3) === MAF_EXT) {
			var newPaths = convertMaf(snv_file);
			snv_file = newPaths['snvs'];
			samples_file = newPaths['samples'];
		}

		// Pass the files to the parsers
		Dataset.addDatasetFromFile(dataset, group_name, samples_file, snv_file, cna_file, aberration_file,
								   data_matrix_file, data_matrix_name, annotation_colors_file, cancer_input,
								   false, color, req.user._id)
			.then(function(){
				// Once the parsers have finished, destroy the tmp files
				if (snv_file) fs.unlinkSync( snv_file );
				if (cna_file) fs.unlinkSync( cna_file );
				if (samples_file) fs.unlinkSync( samples_file );
				if (annotation_colors_file) fs.unlinkSync( annotation_colors_file );
				if (aberration_file) fs.unlinkSync( aberration_file );
				if (cancer_file) fs.unlinkSync( cancer_file );
				if (data_matrix_file) fs.unlinkSync( data_matrix_file );

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
exports.uploadCancer = function uploadCancer(req, res){
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
