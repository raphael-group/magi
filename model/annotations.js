// Import required modules
var mongoose = require( 'mongoose' ),
	Database = require('./db');

// Create GeneSet schema and add it to Mongoose
var AnnotationSchema = new mongoose.Schema({
	gene: { type: String, required: true},
	transcript: { type: String, required: false},
	change: { type: String, required: false},
	mutation_class: { type: String, required: true},
	cancer: { type: String, required: true },
	position: { type: Number, required: false},
	domain: { type: {}, required: false},
	mutation_type: { type: String, required: false},
	references: { type: Array, required: false, default: [] },
	support: { type: Array, required: false, default: [] },
	created_at: { type: Date, default: Date.now }
});

Database.magi.model( 'Annotation', AnnotationSchema );

// upsert an annotation into MongoDB
exports.upsertAnnotation = function(query, pmid, comment, user_id, callback ){
	var Annotation = Database.magi.model( 'Annotation' );

	var support = {ref: pmid, user_id: user_id, comment: comment};
	Annotation.findOneAndUpdate(
		query,
		{$push: {support: support}},
		{safe: true, upsert: true},
		function(err, annotation) {
			if (err) throw new Error(err);
			var addReference = annotation.references.filter(function(r){ return r.pmid == pmid }).length == 0;

			if (addReference){
				annotation.references.push( {pmid: pmid, upvotes: [], downvotes: []} )
				annotation.markModified('references');
			}

			annotation.save(function(err, annotation){
				if (err) throw new Error(err);
				callback(err, annotation);
			});
		}
	);
}

// Vote for a mutation
exports.vote = function mutationVote(fields, user_id){
	// Set up the promise
	var Annotation = Database.magi.model( 'Annotation' );
		Q = require( 'q' ),
		d = Q.defer();

	//Create and execute the query
	var pmid = fields.pmid,
		vote = fields.vote;

	Annotation.findById(fields._id, function(err, annotation){
		// Throw error and resolve if necessary
		if (err){
			throw new Error(err);
			d.resolve();
		}
		console.log(annotation)
		// Update the vote for the reference
		annotation.references.forEach(function(ref){
			if (ref.pmid == pmid){
				var upIndex = ref.upvotes.indexOf( user_id ),
					downIndex = ref.downvotes.indexOf( user_id );
				if (vote == "up"){
					if (upIndex == -1) ref.upvotes.push( user_id );
					else ref.upvotes.splice(upIndex, 1);
					if (downIndex != -1) ref.downvotes.splice(downIndex, 1);
				}
				else if (vote == "down"){
					if (downIndex == -1) ref.downvotes.push( user_id );
					else ref.downvotes.splice(downIndex, 1);
					if (upIndex != -1) ref.upvotes.splice(upIndex, 1);
				}
				annotation.markModified('references');
			}
		})

		// Then save the annotation
		annotation.save(function(err){
			if (err) throw new Error(err);
			d.resolve();
		});
	});

	return d.promise;
}

// Loads annotations into the database
exports.loadAnnotationsFromFile = function(filename, callback){
	// Load required modules
	var fs = require( 'fs' ),
		Annotation = Database.magi.model( 'Annotation' ),
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

	function mutationTypeToClass(ty){
		ty = ty.toLowerCase();
		if (ty == 'missense') return 'missense';
		else if (ty == 'nonsense') return 'nonsense';
		else if (ty == 'del') return 'del';
		else if (ty == 'amp') return 'amp';
		else if (ty == 'fus') return 'fus';
		else return ty;
	}

	function processAnnotations(){
		// Load the lines, but skip the header (the first line)
		var lines = data.trim().split('\n');

		// Make sure there're some lines in the file
		if (lines.length < 2){
			console.log("Empty file (or just header). Exiting.")
			process.exit(1);
		}

		// Create objects to represent each annotation
		var annotations = [];
		for (var i = 1; i < lines.length; i++){
			// Parse the line
			var fields = lines[i].split('\t'),
				support = {
					gene: fields[0],
					transcript: fields[1] == '' ? null : fields[1],
					cancer: fields[2],
					mutation_type: fields[3],
					mutation_class: mutationTypeToClass(fields[3]),
					locus: fields[4] == '' ? null : fields[4],
					change: fields[5] == '' ? null : fields[5],
					pmid: fields[6],
					comment: fields.length > 7 ? fields[8] : null
				}
			annotations.push( support );
		}
		console.log( "Loaded " + annotations.length + " annotations." )

		// Save all the annotations
		return Q.allSettled( annotations.map(function(A){
			var d = Q.defer();
			var query = {
					gene: A.gene,
					cancer: A.cancer,
					mutation_class: A.mutation_class,
					change: A.change
				};

			exports.upsertAnnotation(query, A.pmid, A.comment, null, function(err, annotation){
				if (err) throw new Error(err);
				d.resolve();
			})
			return d.promise;
		}));
	}

	loadAnnotationFile().then( processAnnotations ).then( function(){ callback("") } );
}