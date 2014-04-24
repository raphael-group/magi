// Import required modules
var mongoose = require( 'mongoose' );

// Create GeneSet schema and add it to Mongoose
var AnnotationSchema = new mongoose.Schema({
	gene: { type: String, required: true},
	mutation_class: { type: String, required: false},
	cancer: { type: String, required: true },
	position: { type: Number, required: false},
	domain: { type: {}, required: false},
	mutation_type: { type: String, required: false},
	support: { type: Array, required: true},
	created_at: { type: Date, default: Date.now, required: true }	
});

mongoose.model( 'Annotation', AnnotationSchema );

// upsert an annotation into MongoDB
exports.upsertAnnotation = function(query, support, callback){
	var Annotation = mongoose.model( 'Annotation' ),
		Q = require( 'q' );

	var d = Q.defer();

	Annotation.findOneAndUpdate(
		query,
		{$push: {support: support}},
		{safe: true, upsert: true},
		function(err, model) {
			console.log(err);
			d.resolve();
		}
	);

	return d.promise;
}

// Loads annotations into the database
exports.loadAnnotationsFromFile = function(filename, callback){
	// Load required modules
	var fs = require( 'fs' ),
		Annotation = mongoose.model( 'Annotation' ),
		Q  = require( 'q' );

	// Read in the file asynchronously
	var data;
	function loadAnnotationFile(){	
		var d = Q.defer();
		fs.readFile(filename, 'utf-8', function (err, fileData) {
			// Exit if there's an error, else callback
			if (err) console.log(err)
			d.resolve();
			data = fileData;
		});
		return d.promise;
	}

	function processAnnotations(){
		// Load the lines, but skip the header (the first line)
		var lines = data.trim().split('\n');

		// Make sure there're some lines in the file
		if (lines.length < 2){
			console.log("Empty file (or just header). Exiting.")
			process.exit(1);
		}

		// Create objects to represent each interaction
		var annotations = [];
		for (var i = 1; i < lines.length; i++){
			// Parse the line
			var fields = lines[i].split('\t'),
				support = {
					gene: fields[0],
					cancer: fields[1],
					mutation_class: fields[2],
					support: fields.slice(3, fields.length)
				}

			annotations.push( support );
		}
		console.log( "Loaded " + annotations.length + " annotations." )

		// Save all the interactions
		return Q.allSettled( annotations.map(function(A){
			var d = Q.defer();
			Annotation.create(A, function(err){
				if (err) throw new Error(err);
				d.resolve();
			})
			return d.promise;
		}));
	}

	loadAnnotationFile().then( processAnnotations ).then( function(){ callback("") } );
}