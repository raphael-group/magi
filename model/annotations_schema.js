// Import required modules
Database = require('./db_sql');
var sql = require("sql");

sql.setDialect('postgres')

exports.initDatabase = initDatabase

// type to help link subtypes of annotations
annoTypeName = "anno_sub_type"

// define tables here:
annotations = sql.define({
    name: 'annos',
    columns: [
	{name: 'user_id',       dataType: 'varchar(40)', notNull: true},
	{name: 'u_id', dataType: 'serial', primaryKey: true},
        {name: 'ref_source', 	dataType: 'varchar(20)', notNull: true},
 	{name: 'reference',	dataType: 'varchar(45)', notNull: true},
	{name: 'comment',       dataType: 'varchar(3000)'},
	{name: 'type', dataType: annoTypeName, notNull: true}],
})

// note: our current design allows duplicate aberrations b/c each aberration represents a source as well...
aberrations = sql.define({
    name: 'aberrations',
    columns: [
	{name: 'gene', 		dataType: 'varchar(15)', notNull: true},
	{name: 'transcript',	dataType: 'varchar(20)'},
	{name: 'mut_class', 	dataType: 'varchar(25)', notNull: true}, // todo: mutation table and foreign key?
	{name: 'mut_type',	dataType: 'varchar(35)'},
        {name: 'protein_seq_change', dataType: 'varchar(30)'},
	{name: 'u_id', dataType: 'serial', primaryKey: true}]
});

// note: this schema is not normalized
// todo: pull out source/reference pairs, users into separate tables
source_annos = sql.define({
    name: 'aber_source_annos',
    columns: [
	{name: 'aber_id', dataType: 'integer', references: {table: aberrations.getName(), column: 'u_id', onDelete: 'cascade'}},
	{name: 'cancer',        dataType: 'varchar(40)'},
	{name: 'characterization', dataType: 'varchar(20)'},
	{name: 'comment',	dataType: 'varchar(5000)',},
	{name: 'is_germline',	dataType: 'boolean'},
  	{name: 'measurement_type', 	dataType: 'varchar(30)'},
 	{name: 'reference',	dataType: 'varchar(45)', notNull: true},
        {name: 'source', 	dataType: 'varchar(20)', notNull: true},
	{name: 'asa_u_id',       dataType: 'serial', primaryKey:true},
	{name: 'user_id',       dataType: 'varchar(40)', notNull: true},
    ]});
// todo: maintain unique key constraint with the source?

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
	{name: 'anno_id', dataType: 'integer', primaryKey: true, references: {table: 'annos', column: 'u_id', onDelete: 'cascade'}},
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
    typeConstraint[interactions.getName()] = "ppi";

    // create type first - no support for NOT EXISTS/CREATE OR REPLACE
    // hence this mess
    wholeTypeStr = "DO LANGUAGE plpgsql $$ BEGIN " +
	"IF NOT EXISTS (select 1 FROM pg_type " +
	"WHERE typname='" + annoTypeName + "') " +
	"THEN CREATE TYPE " + annoTypeName +
	" AS ENUM('aber', 'ppi', 'source');" +
	" END IF; END; $$;"

    Database.sql_query(wholeTypeStr, [], function(err, result) {
	if (err) {
	    console.log("Error creating annotation type:", err)
	    throw new Error(err)
	} else {
	    // create annotation table, then aberrations table, then everything else
	    annoCreateQuery = annotations.create().ifNotExists()

	    Database.execute(annoCreateQuery, function(err, result) {
		handle_err(annotations, err)

		console.log("Annotations: postgres init'ed", annotations.getName());
		Database.execute(aberrations.create().ifNotExists(), function(err, result) {
		    handle_err(aberrations, err)

		    console.log("Annotations: postgres init'ed", aberrations.getName());

		    // create subannotation and votes table
		    subannos = [interactions, source_annos, votes]

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
		    });
		});
	    });
	}
    });
}

// export table schemas
exports.annotations = annotations
exports.aberrations = aberrations
exports.interactions = interactions
exports.votes = votes
exports.aber_sources = source_annos;

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