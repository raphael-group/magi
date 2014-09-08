// Load required modules
var Dataset  = require( "../model/datasets" ),
	formidable = require('formidable'),
	fs = require('fs'),
	path = require('path'),
        childProcess = require('child_process');

// must include the '.' otherwise string slicing will be off by one
var MAF_EXT = '.maf';
var MAF2TSV_PATH = '../public/scripts/maf2tsv.py';

// Loads form for users to upload datasets
exports.upload  = function upload(req, res){
	console.log('upload')
	res.render('upload', {user: req.user});
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
        
        return {'snvs' : outputPrefix + "-snvs.tsv",
                'samples' : outputPrefix + "-samples.tsv"};
    };
    
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
