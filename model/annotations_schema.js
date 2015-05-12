// Import required modules                                                                                                                               
var sql = require("sql");

sql.setDialect('postgres')

// define tables here:
// todo: enforce uniqueness of secondary (non-null) keys with constraints
aberrations = sql.define({
    name: 'aberrations',
    columns: [
	{name: 'gene', 		dataType: 'varchar(15)', notNull: true},
	{name: 'transcript',	dataType: 'varchar(20)'},
	{name: 'mut_class', 	dataType: 'varchar(15)', notNull: true},
	{name: 'mut_type',	dataType: 'varchar(15)'},
        {name: 'protein_seq_change', dataType: 'varchar(15)'},
        {name: 'source', 	dataType: 'varchar(20)', notNull: true},
	{name: 'is_germline',	dataType: 'boolean'},
  	{name: 'measurement_type', 	dataType: 'varchar(10)'},
	{name: 'comment',	dataType: 'varchar(5000)',},
	{name: 'anno_id', dataType: 'integer', primaryKey: true, 
	 references: {table:'annos', column: 'u_id'}}]
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
	{name: 'anno_id', dataType: 'integer', primaryKey: true, 
	 references: {table:'annos', column: 'u_id'}}]
})

annotations = sql.define({
    name: 'annos',
    columns: [
	{name: 'user_id',       dataType: 'varchar(40)', notNull: true},
	{name: 'u_id', dataType: 'serial', primaryKey: true},
 	{name: 'reference',	dataType: 'varchar(25)', notNull: true}, 
	{name: 'type', dataType: 'varchar(15)', notNull: true}]	
})

votes = sql.define({
    name: 'votes',
    columns: [
	{name: 'anno_id', dataType: 'integer', primaryKey: true,
	 references: {table: 'annos', column: 'u_id'}},
	{name: 'user_id', dataType: 'varchar(40)', notNull: true},
	{name: 'direction', dataType: 'integer', notNull: true},
	{name: 'comment', dataType: 'varchar(100)'}]
})

// order matters
exports.annotations = annotations
exports.tables = [aberrations, interactions, votes]
