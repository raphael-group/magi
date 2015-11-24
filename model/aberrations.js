// Import required modules
Database = require('./db_sql');
DjangoDatabase = require('./db_django');
Schemas = require('./annotations_schema');
Annotations = require('./annotations');
Utils = require('./util');
var sql = require("sql");

// find all mutation annotations given a structure with regexp
// and the user provided sources for each
exports.geneFind = function(query, dir, callback) {
    var abers = Schemas.aberrations,
	annos = Schemas.annotations,
	cancers = Schemas.cancers,
    ref = Schemas.references;

    var selAnnosQuery;
    // todo: use mode aggregate function?
    // Selects the desired annotations according to the given filter
    if (dir == 'left'){ // the query is for the annotations (e.g. user_id)
        selAnnosQuery = sources.from(abers.joinTo(sources)).where(query);
    } else if (dir == 'right'){ // the query is for the aberrations (e.g. gene)
	     selAnnosQuery = ref.from(
				ref.join(abers).on(ref.mutation_id.equals(abers.id))
				   .join(annotations).on(ref.id.equals(annotations.reference_id))
				   .leftJoin(cancers).on(cancers.abbr.equals(annotations.cancer_id))).where(query);
    }

    // TODO: use annos.table.columns to automatically separate
    DjangoDatabase.execute(selAnnosQuery, function(err, result) {
      if (err) {
            console.log("Error selecting gene annotations: " + err);
	    //console.log("Debug: full query:", selAnnosQuery)
	    callback(err, null)
	}

	// normalize: put all sources with their aberrations;
	var collatedResult = [], refIdx = {};

	// todo: normalize heritability
	// todo: normalize the schema so that source and reference are independent
	var aber_anno_columns = Schemas.getColumnNames(abers);
	aber_anno_columns.push('reference');
	aber_anno_columns.push('source');
	result.rows.forEach(function (sourceData) {
		sourceData.cancer_name = sourceData.name; // explicity tag
	    var aberAnno={};
	    aber_anno_columns.forEach(function(column) {
		aberAnno[column] = sourceData[column];
	    });

	    if(aberAnno.u_id in refIdx) {
		collatedResult[refIdx[aberAnno.u_id]].sourceAnnos.push(sourceData);
	    } else {
		aberAnno.sourceAnnos=[sourceData];
		refIdx[aberAnno.u_id] = collatedResult.length;
		collatedResult.push(aberAnno);
	    }
	})
	callback(null, {rows: result.rows, collatedResult: collatedResult});
    })
}

// upsert an aberration annotation into SQL
exports.upsertAber = function(data, callback){
    // TODO: rewrite me and upsertSourceAnno
    var abers = Schemas.aberrations;

    handleErr = function(err, subresult, query) {
	if (err == null && subresult.rows.length == 0) {
	    err = Error("Did not return annotation ID")
	}
	if (err) {
            console.log("Error upserting gene aberration: " + err);
	    callback(err, null);
	    return
	}
    }

    // TODO: we may insert duplicate mutations, fix this if we want something more interesting with genes

    var now = new Date().toString().substring(0,15);
    var acids=['?','?'], locus;
    // parse the protein sequence change
    if (data.protein_seq_change) {
	acids = data.protein_seq_change.split(/\d+/);
	locus = 0; 	
	if (acids[0].length < data.protein_seq_change.length)
	    locus = parseInt(data.protein_seq_change.substr(acids[0].length));
	if (acids.length == 1)
	    acids[1] = '?';
    }

    
    var aberInsertQuery = abers.insert(
	abers.gene.value(data.gene),
	abers.mutation_class.value(data.mut_class),
	abers.mutation_type.value(data.mut_type),
	abers.locus.value(locus),
	abers.original_amino_acid.value(acids[0]),
	abers.new_amino_acid.value(acids[1]),
	abers.last_edited.value(now),
	abers.created_on.value(now)).returning(abers.id);

	DjangoDatabase.execute(aberInsertQuery, function(err, subresult) {
	    handleErr(err, subresult, aberInsertQuery);
	    if (!err) {
		var aber_u_id = subresult.rows[0].id;
		data.aber_id = aber_u_id;
		exports.upsertSourceAnno(data, callback);
	    }
	});
}

// callback supplies user data
function getUserInfo(user, callback) {

    DjangoDatabase.execute(
	Schemas.users.where({'email': user.email}),
	function (err, user_subresult) {
	    if(err) 
		callback(err, null);
	    else if (user_subresult.rows.length == 1) 
		callback(null, user_subresult.rows[0]);
	    else if (user_subresult.rows.length == 0) {
		first_last_names = user.name.split(" ");
		if (first_last_names.length == 1) 
		    first_last_names[1] = '';

		// todo: pass up error with error requesting login 
		DjangoDatabase.execute(
		    Schemas.users.insert({'first_name': first_last_names[0],
				  'last_name': first_last_names[1],
				  'email': user.email,
				  'username': user.email.split('@')[0],
				  'is_staff': false,
				  'is_superuser': false,
				  'is_active': false,
				  'date_joined': getTime("day"),
				  'password': 'deadbeef'}).returning('*'),
		    function(err, result) {
			if(err) 
			    callback(err, null);
			else {
			    callback(null, result.rows[0]);
			}
		    });
		} else // multiple users?
		    callback(Error("Multiple users with same email " + user.email), 
			     null);
	});
}

// callback supplies user data
function getCancerInfo(cancer_data, callback) {
    
    DjangoDatabase.execute(
	Schemas.cancers.where(cancer_data),
	function (err, user_subresult) {
	    
	    if(err) 
		callback(err, null);
	    else if (user_subresult.rows.length == 1) 
		callback(null, user_subresult.rows[0]);
	    else if (user_subresult.rows.length == 0) {
		var data_key = Object.keys(cancer_data)[0];
		callback(Error("No cancer found with key, value (" + data_key + ", " + cancer_data[data_key] + ")"), null);
	    } else // multiple users?
		callback(Error("Multiple cancers identified with data given"), 
			 null);
	});
}

function getTime(format) {
    if (format == "day") {
	return new Date().toString().substring(0,15);	
    } else if (format == "full") {
	return new Date().toString().substring(0,-7);;
    } else {
	return new Date().toString();
    }
}
	
// note: data requires an aber_id field to identify which aberration this source attaches to
exports.upsertSourceAnno = function upsertSourceAnno(data, callback) {
    var annotatiohs = Schemas.annotations,
    references = Schemas.references,
    users = Schemas.users;;

    // check if a reference exists with that exact annotation
    var checkForExistenceQuery = references.
	where(references.identifier.equals(data.reference),
	      references.db.equals(data.domain),
	      references.mutation_id.equals(data.aber_id));

    DjangoDatabase.execute(checkForExistenceQuery, function(err, result) {
	if (err) {
            console.log("Error upserting source annotation: " + err.error);
	    console.log("Debug: full query:", checkForExistenceQuery.toQuery().text);
	    callback(err, null);
	}
	var now = getTime("day");
	var reference_id,
	writeAnnotation = function(reference_id, data) {
	    getUserInfo(data.user, function(err, user_data) {
		if (err) {
		    console.log("error calling getUserInfo", err);
		    callback(err, null);
		} else {
		    getCancerInfo(data.cancer, function(err, cancer_data) {
			if (err) {
			    console.log("error calling getCancerInfo", err);
			    callback(err, null);
			} else {
			    var writeAnnoQuery = annotations.insert(
				annotations.comment.value(data.comment),
				annotations.cancer_id.value(cancer_data.id), // dummy for now, get cancer table later
				annotations.heritable.value(''), 
				annotations.characterization.value(''),
				annotations.measurement_type.value(''),
				annotations.reference_id.value(reference_id),
				annotations.last_edited.value(now),
				annotations.created_on.value(now),
				annotations.user_id.value(user_data.id)).returning('*'); 
			    DjangoDatabase.execute(writeAnnoQuery, function (err, result) {
				if (err) {
				    console.log("Error upserting source annotation: " + err);
				    console.log("Debug: full query:", writeAnnoQuery.toQuery().text);
				    callback(err, null);
				} else {
				    var anno = result.rows[0];
				    anno.id = anno.pk;
				    callback(null, anno); // return
				}
			    });
			}
		    });
		}
	    });
	};
				  
				  
	if (result && result.rows.length > 0) {
	    reference_id = result.rows.id;
	    writeAnnotation(reference_id, data);
	} else {
	    var referenceInsertQuery = references.insert(
		references.identifier.value(data.reference),
		references.db.value(data.domain),
		references.source.value(data.source),
		references.mutation_id.value(data.aber_id),
		references.last_edited.value(now),
		references.created_on.value(now))
		.returning(references.id);
	    DjangoDatabase.execute(referenceInsertQuery, function (err, result) {
		if (err == null && (!result || result.rows.length == 0)) {
		    err = Error("Did not return annotation ID")
		}
		if (err) {
		    console.log("Error upserting source annotation: " + err);
		    console.log("Debug: full query:", referenceInsertQuery.toQuery().text);
		    callback(err, null)
		}
		writeAnnotation(result.rows[0].id, data);

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
    var Q = require( 'q' ),
    d = Q.defer();

    deleteQuery = sources.delete().where(filter);
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
		reference: A.reference,
		user_id: Annotations.ADMIN_USER
	    };
	    exports.upsertAber(query, function(err, annotation){
		if (err) throw Error(err);
		d.resolve();
	    })
	    return d.promise;
	}));
    }

    loadAnnotationFile().then( processAnnotations ).then( function(){ callback("") } );
}

exports.remove = function(anno_id, user_id) {
    var abers = Schemas.aberrations,
    Q = require( 'q' ),
    d = Q.defer();

    var deleteQuery = abers.delete().where(abers.u_id.equals(anno_id), abers.aber_user_id.equals(user_id));
    Database.execute(deleteQuery, function(err, result) {
	if (err) {
            console.log("Error deleting annotation: " + err);
//	    console.log("Debug: full query:", deleteQuery.toQuery().text)
	    d.reject(err);
	}
	if (result.rowCount != 1) {
	    console.log("Debug: full query:", deleteQuery.toQuery().text, deleteQuery.toQuery().values)
	    console.log("Debug: result:", result.rows);
	    d.reject("Mutation not found for deletion");
	} else {
	    d.resolve();
	}
    });
    return d.promise;
}

// inherit some functions from annotations
exports.inGeneClause = Annotations.inClause(Schemas.aberrations)

exports.vote = function (fields, user_id) {
    return Annotations.vote(fields, user_id, "aber");
}

exports.collateSourceAnnos = function collateSourceAnnos(abers) {
    // calculate the mode of each aberration
    var cols = ["cancer", "is_germline", "measurement_type", "characterization"];
    abers.forEach(function (aber) {
	cols.forEach(function(col) {
	    aber[col + "_mode"] =
		Utils.getMode(aber.sourceAnnos.map(function(c) {return c[col];}));
	});
    });
    return abers;
}
