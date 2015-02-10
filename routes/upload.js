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

// Mapping of exit codes to messages when loading a dataset
// by running the Python loadDataset.py script through a
// child process
var codeToMsg = {
	0: "<b>Success! </b>Return to the <a href='/'>homepage</a> to query your dataset.",
	2: "Invalid argument. Please <a href='/contact'>contact us</a> for assistance.",
	4: "Error downloading sample/annotation color file.",
	5: "Error reading in sample/annotation color file.",
	14: "Error downloading SNV file. Please check the URL you provided.",
	15: "Error reading in SNV file.",
	24: "Error downloading CNA file. Please check the URL you provided.",
	25: "Error reading in CNA file.",
	34: "Error downloading other aberrations file. Please check the URL you provided.",
	35: "Error reading in other aberrations file.",
	44: "Error downloading data matrix file. Please check the URL you provided.",
	45: "Error reading in data matrix file.",
	50: "Unknown fatal error. Please <a href='/contact'>contact us</a> for assistance.",
	60: "Fatal error: No valid data in mutation files and no data matrix => no data to save."
};

function codeToMessage(code){
	if (code in codeToMsg) return codeToMsg[code];
	else return "Unknown error."
}

// Loads form for users to upload datasets
exports.upload  = function upload(req, res){
	console.log('upload')
	var Cancer = Database.magi.model( 'Cancer' );
	Cancer.find({}, function(err, cancers){
		if (err) throw new Error(err);
		else{
			cancers.sort(function(a, b){ return a.cancer > b.cancer ? 1 : -1; });
			var tcga_icgc_cancers = cancers.filter(function(d){ return d.is_public; }),
				user_cancers = cancers.filter(function(d){ return !d.is_public; });
			res.render('upload', {user: req.user, tcga_icgc_cancers: tcga_icgc_cancers, user_cancers: user_cancers });
		}
	});
}

// Load a JSON manifest file and send the data to the server
exports.uploadManifest = function uploadManifest(req, res){
	console.log('/upload/manifest');
	if (req.user && req.files && req.files.Manifest){
		var manifestFile = req.files.Manifest.path;
		fs.readFile(manifestFile, 'utf-8', function (err, data) {
			if (err){
				res.send({error: err});
				throw new Error(err);
			} else {
				try{
					res.send({status: "Success!", data: JSON.parse(data) });
				} catch(e){
					res.send({error: "Not a valid JSON file."})
				}
			}
			fs.unlinkSync(manifestFile);
		});
	} else {
		console.error("Manifest could not be loaded.")
		res.send({error: "Manifest could not be loaded."})
	}
}

// Parse the user's dataset upload
exports.uploadDataset = function uploadDataset(req, res){
	console.log('/upload/dataset');

	// Parse the form variables into shorter handles
	var fields = req.body,
		files = req.files,
		dataset = fields.Dataset,
		groupName = fields.GroupName,
		cancer = fields.Cancer,
		color = fields.Color,
		dataMatrixName = fields.DataMatrixName,
		aberrationType  = fields.AberrationType,
		snvFileFormat = fields.SNVFileFormat,
		cnaFileFormat = fields.CNAFileFormat,
		tmpFiles = [], // file paths we need to remove later
		snvFile, cnaFile, aberrationsFile, dataMatrixFile, sampleAnnotationsFile, annotationColorsFile;

	if (fields.SNVsSource == 'upload'){
		if (files.SNVsLocation){
			snvFile = files.SNVsLocation.path;
			tmpFiles.push(snvFile);
		}
		else{
			snvFile = null;
		}
	} else{
		snvFile = fields.SNVsLocation;
	}

	if (fields.CNAsSource == 'upload'){
		if (files.CNAsLocation){
			cnaFile = files.CNAsLocation.path;
			tmpFiles.push(cnaFile);
		}
		else{
			cnaFile = null;
		}
	} else{
		cnaFile = fields.CNAsLocation;
	}

	if (fields.AberrationsSource == 'upload'){
		if (files.AberrationsLocation){
			aberrationsFile = files.AberrationsLocation.path;
			tmpFiles.push(aberrationsFile);
		}
		else{
			aberrationsFile = null;
		}
	} else{
		aberrationsFile = fields.AberrationsLocation;
	}

	if (fields.DataMatrixSource == 'upload'){
		if (files.DataMatrixLocation){
			dataMatrixFile = files.DataMatrixLocation.path;
			tmpFiles.push(dataMatrixFile);
		}
		else{
			dataMatrixFile = null;
		}
	} else{
		dataMatrixFile = fields.DataMatrixLocation;
	}

	if (fields.SampleAnnotationsSource == 'upload'){
		if (files.SampleAnnotationsLocation){
			sampleAnnotationsFile = files.SampleAnnotationsLocation.path;
			tmpFiles.push(sampleAnnotationsFile);
		}
		else{
			sampleAnnotationsFile = null;
		}
	} else{
		sampleAnnotationsFile = fields.SampleAnnotationsLocation;
	}

	if (fields.AnnotationColorsSource == 'upload'){
		if (files.AnnotationColorsLocation){
			annotationColorsFile = files.AnnotationColorsLocation.path;
			tmpFiles.push(annotationColorsFile);
		}
		else{
			annotationColorsFile = null;
		}
	} else{
		annotationColorsFile = fields.AnnotationColorsLocation;
	}

	// Construct the 
	var args = ['-c', cancer, '-dn', dataset, '--user_id', req.user._id];
	if (groupName) args = args.concat(['-gn', groupName]);
	if (snvFile) args = args.concat(['-sf', snvFile, '-sft', snvFileFormat]);
	if (cnaFile) args = args.concat(['-cf', cnaFile, '-cft', cnaFileFormat]);
	if (aberrationsFile) args = args.concat(['-af', aberrationsFile, '-at', aberrationType]);
	if (dataMatrixFile) args = args.concat(['-dmf', dataMatrixFile, '-mn', dataMatrixName]);
	if (sampleAnnotationsFile) args = args.concat(['-saf', sampleAnnotationsFile]);
	if (annotationColorsFile) args = args.concat(['-acf', annotationColorsFile]);
	cmd = "db/loadDataset.py " + args.join(" ");
	console.log(cmd);

	// Execute the process, log it's intermediate output,
	// and exit and resovlve the promise once it's done
	var msg, err = "", output = "";
	function loadDataset(){
		var d = Q.defer(),
			child = childProcess.exec(cmd);

		child.on('stdout', function(stdout){ output += stdout; });
		child.on('stderr', function(stderr){ err += stderr; });
		child.on('close', function(closeCode) { code = closeCode; });

		child.on('exit', function (exitCode) {
			msg = codeToMessage(exitCode);
			tmpFiles.forEach(function(filename){ fs.unlinkSync(filename); })
			d.resolve();
		});

		return d.promise;
	}

	loadDataset().then(function(){
		if (output || err){ output = output + "<br/>" + err; }
		res.send({ status: msg, output: output });
	})
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
	Cancer.create({name: name, abbr: abbr, color: color, is_public: false}, function(err, cancer){
		if (err) throw new Error(err);
		res.redirect("/cancers");
	});
}
