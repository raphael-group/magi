// Load required modules
var mongoose = require( 'mongoose' ),
	Q = require( 'q' ),
	Dataset  = require( "../model/datasets" ),
	Database = require('../model/db'),
	formidable = require('formidable'),
	fs = require('fs'),
	Cancers  = require( "../model/cancers" ),
	path = require('path');
	childProcess = require('child_process');

// must include the '.' otherwise string slicing will be off by one
var MAF_EXT = '.maf';
var MAF2TSV_PATH = 'public/scripts/mafToTSV.py';

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
	function convertMaf(prefix, ext) {
		// Set up a promise to return once the child process
		// is complete
		var d = Q.defer();
		if (ext !== MAF_EXT){
			d.resolve();
		} else{
			// Set up the arguments for the command
			var args = ['--maf_file', prefix + ext,
					// TODO: how to choose which transcript db?
					'--transcript_db', 'refseq', // 'ensemble',
					'--output_prefix', prefix
				   ],
				cmd = MAF2TSV_PATH + " " + args.join(" ");

			// Execute the process, log it's intermediate output,
			// and exit and resovlve the promise once it's done
			var child = childProcess.exec(cmd);
			child.on('stdout', function(stdout){
				console.log(stdout)
			});
			child.on('stderr', function(stderr){
				console.log(stderr);
			})
			child.on('close', function(code) {
				console.log('closing code: ' + code);
			});
			child.on('exit', function (code) {
				console.log('Child process exited with exit code '+code);
				d.resolve();
			});
		}
		return d.promise;
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
		var prefix = snv_file ? snv_file.slice(0, -(MAF_EXT.length)) : "",
			ext = snv_file ? snv_file.slice(-(MAF_EXT.length)) : "";

		convertMaf(prefix, ext).then(function(){
			if (ext == MAF_EXT){ snv_file = prefix + "-snvs.tsv"; }
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
