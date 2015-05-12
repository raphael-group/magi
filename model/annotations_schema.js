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
 	{name: 'reference',	dataType: 'varchar(25)', notNull: true}, 
	{name: 'type', dataType: annoTypeName, primaryKey: true, 
	 notNull: true}]	
})
aberrations = sql.define({
    name: 'aberrations',
    columns: [
	{name: 'gene', 		dataType: 'varchar(15)', notNull: true},
	{name: 'transcript',	dataType: 'varchar(20)'}, // not used
	{name: 'mut_class', 	dataType: 'varchar(15)', notNull: true}, // todo: mutation table and foreign key?
	{name: 'mut_type',	dataType: 'varchar(35)'},
        {name: 'protein_seq_change', dataType: 'varchar(15)'},
        {name: 'source', 	dataType: 'varchar(20)', notNull: true},
	{name: 'is_germline',	dataType: 'boolean'}, // not used
  	{name: 'measurement_type', 	dataType: 'varchar(10)'}, // not used
	{name: 'comment',	dataType: 'varchar(5000)',},
	{name: 'anno_type',	dataType: annoTypeName + " DEFAULT 'aber'", notNull:true}, // todo: make this a constraint
	{name: 'anno_id', dataType: 'integer', primaryKey: true}]
})

interactions = sql.define({
    name: 'ppis',
    columns: [
	{name: 'source',	dataType: 'varchar(15)', notNull: true},
	{name: 'target',	dataType: 'varchar(15)', notNull: true},
	{name: 'database',	dataType: 'varchar(30)'},
	{name: 'type',	 dataType: 'varchar(15)'},
	{name: 'weight', dataType: 'float'},
	{name: 'directed',	dataType: 'boolean'},
	{name: 'reference',	dataType: 'varchar(25)', notNull: true},
	{name: 'tissue',	dataType: 'varchar(30)'},
	{name: 'anno_type',	dataType: annoTypeName + " DEFAULT 'ppi'", notNull:true},
	{name: 'anno_id', dataType: 'integer', primaryKey: true}]
})

votes = sql.define({
    name: 'votes',
    columns: [
	{name: 'anno_id', dataType: 'integer', primaryKey: true},
	{name: 'anno_type',	dataType: annoTypeName, notNull:true, primaryKey: true},
	{name: 'voter_id', dataType: 'varchar(40)', notNull: true, primaryKey: true},
	{name: 'direction', dataType: 'integer', notNull: true},
	{name: 'comment', dataType: 'varchar(100)'}]
})

function initDatabase() {
    handle_err = function(table, err) {
	if (err) {
	    console.log("Error creating", table.getName(), "table:", err)
	    throw new Error(err)
	}
    }

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
		subannos.forEach( function (thisTable) {
		    createQuery = thisTable.create().ifNotExists() 
		    // todo: add constraint for sub anno_types
		    constraint = "FOREIGN KEY ( anno_id, anno_type )" +
			" REFERENCES annos ( u_id, type ) ON DELETE CASCADE"

		    Database.executeAppend(createQuery, constraint, function(err, result) {
			handle_err(thisTable, err)
			console.log("Annotations: postgres init'ed", thisTable.getName(), "table");
		    })
		})
	    })
	}
    })
}

// export table schemas
exports.annotations = annotations
exports.aberrations = aberrations
exports.interactions = interactions
exports.votes = votes


