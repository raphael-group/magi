// Import required modules                                                                                                                               
Database = require('./db_sql');
var sql = require("sql");

sql.setDialect('postgres')

exports.initDatabase = initDatabase

// type to help link subtypes of annotations
annoTypeName = "anno_sub_type"
//annoTypes = ["aber", "ppi"]

// define tables here:
annotations = sql.define({
    name: 'annos',
    columns: [
	{name: 'user_id',       dataType: 'varchar(40)', notNull: true},
	{name: 'u_id', dataType: 'serial', primaryKey: true},
	{name: 'comment',	dataType: 'varchar(5000)',},
 	{name: 'reference',	dataType: 'varchar(45)', notNull: true},
	{name: 'type', dataType: annoTypeName, notNull: true}],
})

aberrations = sql.define({
    name: 'aber_annos',
    columns: [
	{name: 'gene', 		dataType: 'varchar(15)', notNull: true},
	{name: 'cancer',        dataType: 'varchar(40)'},
	{name: 'transcript',	dataType: 'varchar(20)'},
	{name: 'mut_class', 	dataType: 'varchar(25)', notNull: true}, // todo: mutation table and foreign key?
	{name: 'mut_type',	dataType: 'varchar(35)'},
        {name: 'protein_seq_change', dataType: 'varchar(30)'},
        {name: 'source', 	dataType: 'varchar(20)', notNull: true},
	{name: 'is_germline',	dataType: 'boolean'}, // not used
  	{name: 'measurement_type', 	dataType: 'varchar(10)'}, // not used
	{name: 'anno_type',	dataType: annoTypeName + " DEFAULT 'aber'", notNull:true},
	{name: 'anno_id', dataType: 'integer', primaryKey: true, references: {table: 'annos', column: 'u_id', onDelete: 'cascade'}}]
})

// todo: maintain unique key constraint with the source?
//aberrations.unique = ["gene", "cancer", "mut_class", "mut_type",

interactions = sql.define({
    name: 'ppi_annos',
    columns: [
	{name: 'source',	dataType: 'varchar(15)', notNull: true},
	{name: 'target',	dataType: 'varchar(15)', notNull: true},
	{name: 'database',	dataType: 'varchar(30)'},
	{name: 'type',	 dataType: 'varchar(15)'},
	{name: 'weight', dataType: 'float'},
	{name: 'directed',	dataType: 'boolean'},
	{name: 'tissue',	dataType: 'varchar(30)'},
	{name: 'anno_type',	dataType: annoTypeName + " DEFAULT 'ppi'", notNull:true},
	{name: 'anno_id', dataType: 'integer', primaryKey: true, references: {table: 'annos', column: 'u_id', onDelete: 'cascade'}}]
})

votes = sql.define({
    name: 'votes',
    columns: [
	{name: 'anno_id', dataType: 'integer', primaryKey: true},
	{name: 'anno_type',	dataType: annoTypeName, notNull:true, primaryKey: true},
	{name: 'voter_id', dataType: 'varchar(40)', notNull: true, primaryKey: true},
	// integrity check: only one vote at a time
	{name: 'direction', dataType: 'smallint', notNull: true},
	{name: 'comment', dataType: 'varchar(3000)'}]
})

function initDatabase() {
    handle_err = function(table, err) {
	if (err) {
	    console.log("Error creating", table.getName(), "table:", err)
	    throw new Error(err)
	}
    }

    typeConstraint = {};
    typeConstraint[aberrations.getName()] = "aber";
    typeConstraint[interactions.getName()] = "ppi";

    // create type first - no support for NOT EXISTS/CREATE OR REPLACE
    // hence this mess
    wholeTypeStr = "DO LANGUAGE plpgsql $$ BEGIN " +
	"IF NOT EXISTS (select 1 FROM pg_type " +
	"WHERE typname='" + annoTypeName + "') " +
	"THEN CREATE TYPE " + annoTypeName +
	" AS ENUM('aber', 'ppi');" +
	" END IF; END; $$;"

    Database.sql_query(wholeTypeStr, [], function(err, result) {
	if (err) {
	    console.log("Error creating annotation type:", err)
	    throw new Error(err)
	} else {
	    // create annotation table, then everything else
	    annoCreateQuery = annotations.create().ifNotExists()

	    Database.execute(annoCreateQuery, function(err, result) {
		handle_err(annotations, err)
		console.log("Annotations: postgres init'ed", annotations.getName(), "table");

		// create subannotation and votes table
		subannos = [aberrations, interactions, votes]

		// key value constraint
		addTypeValueConstraintFn = function (table) {
		    return "CHECK (anno_type = '" +
			typeConstraint[table.getName()] + "')"
		}

		subannos.forEach( function (thisTable) {
		    createQuery = thisTable.create().ifNotExists()

		    constraint = ""
		    if (thisTable.getName() in typeConstraint) {
			constraint = addTypeValueConstraintFn(thisTable)
		    }
		    Database.executeAppend(createQuery, constraint, function(err, result) {
			handle_err(thisTable, err)
			console.log("Annotations: postgres init'ed", thisTable.getName(), "table");
		    });
		})
	    });
	}
    });
}

// export table schemas
exports.annotations = annotations
exports.aberrations = aberrations
exports.interactions = interactions
exports.votes = votes


exports.normalizeAnnotation = function(anno) {
    // convert null votes to []
    if (anno.upvotes == null) {
	anno.upvotes = []
    }
    if (anno.downvotes == null) {
	anno.downvotes = []
    }
    return anno;
}

exports.parsePMID = function(pmid_field) {
    // parse PMIDs if necessary:
    if (pmid_field === undefined) 
	return ["none"]

    if (pmid_field.indexOf(",") == -1) 
	return [pmid_field];

    return pmid_field.split(",");
}

// join a query with the list of all user_ids who have voted on a particular annotation
exports.joinVoteListsToQuery = function(query) {
    // Retrieve upvotes and downvotes for every annotation
    upvotesQuery = "(SELECT anno_id, array_agg(voter_id) AS upvotes " +
	" FROM votes WHERE direction =  1 group by anno_id) AS U";

    downvotesQuery = " (SELECT anno_id, array_agg(voter_id) AS downvotes " +
	" FROM votes WHERE direction = -1 group by anno_id) as D ";

    selQuerySplit = query.toQuery().text.split("WHERE");

    // Join the upvote/downvote table within the annotation selection
    wholeQueryText = selQuerySplit[0] + " LEFT JOIN " +
	upvotesQuery + " ON U.anno_id = annos.u_id LEFT JOIN " +
	downvotesQuery + " ON D.anno_id = annos.u_id WHERE " +
    selQuerySplit[1];

    return wholeQueryText;
}