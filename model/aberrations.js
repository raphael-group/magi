// Import required modules
Database = require('./db_sql');
Schemas = require('./annotations_schema');
Annotations = require('./annotations');
var sql = require("sql");

// find all mutation annotations given a structure with regexp
// and the user provided sources for each
exports.geneFind = function(query, dir, callback) {
    var abers = Schemas.aberrations,
    sources = Schemas.aber_sources;

    var selAnnosQuery;
    // todo: use mode aggregate function?
    // Selects the desired annotations according to the given filter
    if (dir == 'left'){ // the query is for the annotations (e.g. user_id)
        selAnnosQuery = sources.from(abers.joinTo(sources)).where(query);
    } else if (dir == 'right'){ // the query is for the aberrations (e.g. gene)
	selAnnosQuery = abers.from(sources.joinTo(abers)).where(query);
    }

    // TODO: use annos.table.columns to automatically separate
//    var joinedQuery = Annotations.joinVoteListsToQuery(sources, selAnnosQuery);
    Database.execute(selAnnosQuery, function(err, result) {
	if (err) {
            console.log("Error selecting gene annotations: " + err);
	    console.log("Debug: full query:", selAnnosQuery)
	    callback(err, null)
	}

	// normalize: put all sources with their aberrations;
	var collatedResult = [], refIdx = {};

	// todo: normalize heritability
	// todo: normalize the schema so that source and reference are independent
	aber_anno_columns = abers.columns.map(function (c) {return c.name;})
	aber_anno_columns.push('reference');
	aber_anno_columns.push('source');
	result.rows.forEach(function (sourceData) {
	    var aberAnno={};
	    aber_anno_columns.forEach(function(column) {
		aberAnno[column] = sourceData[column];
		delete sourceData[column];
	    });

	    if(aberAnno.u_id in refIdx) {
		collatedResult[refIdx[aberAnno.u_id]].sourceAnnos.push(sourceData);
	    } else {
		aberAnno.sourceAnnos=[sourceData];
		refIdx[aberAnno.u_id] = collatedResult.length;
		collatedResult.push(aberAnno);
	    }
	})
	callback(null, collatedResult);
    })
}

// upsert an aberration annotation into SQL
exports.upsertAber = function(data, callback){
    var abers = Schemas.aberrations;

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
    // TODO: may insert duplicates, fix this if we want something more interesting with genes

    var aberInsertQuery = abers.insert(
	abers.gene.value(data.gene),
	abers.transcript.value(data.transcript),
	abers.mut_class.value(data.mut_class),
	abers.mut_type.value(data.mut_type),
	abers.protein_seq_change.value(data.protein_seq_change)).returning(abers.u_id);

    Database.execute(aberInsertQuery, function(err, subresult) {
	var aber_u_id = subresult.rows[0].u_id;
	handleErr(err, subresult, aberInsertQuery);

	data.aber_id = aber_u_id;
	exports.upsertSourceAnno(data, callback);
    });
}

// note: requires an aber_id field to identify which aberration this source attaches to
exports.upsertSourceAnno = function(data, callback) {
    var sources = Schemas.aber_sources;

    // check if a record exists
    var updateQuery = sources.update(data).
	where(sources.aber_id.equals(data.aber_id),
	      sources.user_id.equals(data.user_id)).
	returning(sources.asa_u_id);
    Database.execute(updateQuery, function(err, result) {
	if (err) {
            console.log("Error upserting source annotation: " + err);
	    console.log("Debug: full query:", sourceInsertQuery.string)
	    callback(err, null);
	}
	if (result && result.rows.length > 0) {
	    callback(null, result.rows[0]); // return
	} else {
	    var sourceInsertQuery = sources.insert(data).returning(sources.asa_u_id);
	    Database.execute(sourceInsertQuery, function (err, result) {
		if (err == null && (!result || result.rows.length == 0)) {
		    err = Error("Did not return annotation ID")
		}
		if (err) {
		    console.log("Error upserting source annotation: " + err);
		    console.log("Debug: full query:", sourceInsertQuery.string)
		    callback(err, null)
		}
		callback(null, result.rows[0]); // return
	    });
	}
    });
}

// delete according to a filter:
exports.deleteSourceAnno = function(filter) {
    var sources = Schemas.aber_sources;
    if (filter.user_id) {
	filter.user_id = String(filter.user_id);
    }
    console.log("filter");
    var Q = require( 'q' ),
    d = Q.defer();

    deleteQuery = sources.delete().where(filter);
    console.log("query", deleteQuery.toQuery().text, deleteQuery.toQuery().values);
    Database.execute(deleteQuery, function(err, result) {
	if (err) {
            console.log("Error deleting annotation: " + err);
//	    console.log("Debug: full query:", deleteQuery.string)
	    d.reject(err);
	}
	if (result.rowCount != 1) {
	    d.reject("Annotation not found for deletion.");
	} else {
	    d.resolve();
	}
    });

    return d.promise;

}

// update is for an aber_source annotation
exports.update = function(data, callback) {
    var aber_sources = Schemas.aber_sources;

    var updateQuery = aber_sources.update(data).
	where(abers.anno_id.equals(data.anno_id)).
	returning(abers.anno_id);
    Database.execute(updateQuery, function(err, result) {
	if (err == null && result.rows.length == 0) {
	    err = Error("Did not return annotation ID");
	}
	if (err) {
            console.log("Error upserting gene annotation: " + err);
	    console.log("Debug: full query:", query.string)
	    callback(err, null);
	} else {
	    callback(null, result.rows[0]);
	}
    });
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
