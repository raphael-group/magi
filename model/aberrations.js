// Import required modules
Database = require('./db_sql');
Schemas = require('./annotations_schema');
Annotations = require('./annotations');
var sql = require("sql");

// find all mutation annotations given a structure with regexp
// and the ids of users who have submitted upvotes/downvotes on each
exports.geneFind = function(query, dir, callback) {
    abers = Schemas.aberrations
    annos = Schemas.annotations
    votes = Schemas.votes

    // Selects the desired annotations according to the given filter
    if (dir == 'left'){ // the query is for the annotations (e.g. user_id)
        selAnnosQuery = annos.from(annos.joinTo(abers)).where(annos.user_id.equals(query.user_id));
    } else if (dir == 'right'){ // the query is for the aberrations (e.g. gene)
	selAnnosQuery = abers.from(abers.joinTo(annos)).where(query);
    }

    // TODO: use annos.table.columns to automatically separate

var joinedQuery = Annotations.joinVoteListsToQuery(selAnnosQuery);
    Database.sql_query(joinedQuery, selAnnosQuery.toQuery().values, function(err, result) {
	if (err) {
            console.log("Error selecting gene annotations: " + err);
	    console.log("Debug: full query:", selAnnosQuery.string)
	    callback(err, null)
	}

	callback(null, result.rows.map(Annotations.normalize))
    })
}

// upsert an aberration annotation into SQL
exports.upsertAber = function(data, callback){
    abers = Schemas.aberrations
    annos = Schemas.annotations

    annoInsertQuery = annos.insert([{
	user_id : data.user_id,
	reference : data.pmid,
	comment : data.comment,
	type : "aber" }]).returning(annos.u_id)

    handleErr = function(err, subresult, query) {
	if (err == null && subresult.rows.length == 0) {
	    err = Error("Did not return annotation ID")
	}
	if (err) {
            console.log("Error upserting gene annotation: " + err);
	    console.log("Debug: full query:", query.string)
	    callback(err, null)
	}
    }

    // todo: test update case
    // todo: transaction-ize w/ rollback (not necessary, just good to clean the annos table)
    Database.execute(annoInsertQuery, function(err, subresult) {
	handleErr(err, subresult, annoInsertQuery)
	u_id = subresult.rows[0].u_id
	aberInsertQuery = abers.insert(
	    abers.gene.value(data.gene),
	    abers.cancer.value(data.cancer),
	    abers.transcript.value(data.transcript),
	    abers.mut_class.value(data.mut_class),
	    abers.mut_type.value(data.mut_type),
	    abers.protein_seq_change.value(data.protein_seq_change),
	    abers.source.value(data.source),
	    abers.anno_id.value(u_id)).returning(abers.anno_id) // we can re turn more if we want

	Database.execute(aberInsertQuery, function(err, result) {
	    handleErr(err, result, aberInsertQuery)
	    callback(null, result.rows[0]) // what do we want to return?
	})
    })
}

// Loads annotations into the database
exports.loadFromFile = function(filename, source, callback){
    // Load required modules
    var fs = require( 'fs' ),
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

	// Create objects to represent each annotation
	var annotations = [];
	for (var i = 1; i < lines.length; i++){
	    // Parse the line
	    var fields = lines[i].split('\t'),
	    references = Annotations.parsePMID(fields[7])
	    
	    references.forEach(function(pmid) {
		annotations.push({
		    gene: fields[0],
		    transcript: fields[1] == '' ? null : fields[1], // not used
		    cancer: fields[2] == '' ? null : fields[2],
		    mutation_class: fields[3],
		    mutation_type: fields[4],
		    locus: fields[5] == '' ? null : fields[5], // not used
		    change: fields[6] == '' ? null : fields[6],
		    reference: pmid, //pmid
		    comment: fields.length > 8 ? fields[8] : null,
		    source: source
		});
	    });
	}
	console.log( "Loading " + annotations.length + " aberration annotations from file..." )
	// Save all the annotations
	return Q.allSettled( annotations.map(function(A){
	    var d = Q.defer();

	    cancer = A.cancer ? A.cancer.toUpperCase() : "Cancer"
	    var query = {
		gene: A.gene,
		cancer: cancer,
		change: A.change,
		transcript: A.transcript,
		mut_class: A.mutation_class,
		mut_type: A.mutation_type,
		pmid: A.reference,
		comment: A.comment,
		source: source,
		user_id: Annotations.ADMIN_USER
	    };
	    exports.upsertAber(query, function(err, annotation){
		if (err) throw new Error(err);
		d.resolve();
	    })
	    return d.promise;
	}));
    }

    loadAnnotationFile().then( processAnnotations ).then( function(){ callback("") } );
}

// inherit some functions from annotations
exports.inGeneClause = Annotations.inClause(Schemas.aberrations)
exports.remove = Annotations.annoDelete;
exports.vote = function (fields, user_id) {
    return Annotations.vote(fields, user_id, "aber");
}
