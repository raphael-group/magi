// Import required modules
Database = require('./db_sql');
DjangoDatabase = require('./db_django');
var sql = require("sql");

sql.setDialect('postgres')

exports.initDatabase = initDatabase

// type to help link subtypes of annotations
var annoTypeName = "anno_sub_type"

// define tables here:
exports.annotations = annotations = sql.define({
    name: 'annotations_annotation',
    columns: [
	{name: 'id', dataType: 'serial', primaryKey: true},
	{name: 'comment',	dataType: 'varchar(300)',},
  	{name: 'heritable', dataType: 'varchar(8)'},
	{name: 'measurement_type', dataType: 'varchar(30)', notNull: true},
	{name: 'characterization', dataType: 'varchar(20)', notNull: true},
	{name: 'reference_id',	dataType: 'integer', notNull: true},
	{name: 'cancer_id', dataType: 'integer', notNull: true},
	{name: 'user_id', dataType: 'integer', notNull: true},
	{name: 'last_edited', dataType: 'date'},
	{name: 'created_on', dataType: 'date'}]
})


// note: our current design allows duplicate aberrations b/c each aberration represents a source as well...
exports.aberrations = aberrations = sql.define({
    name: 'annotations_mutation',
    columns: [
      {name: 'gene_id', 		dataType: 'varchar(30)', notNull: true},
	{name: 'id', 		dataType: 'serial', notNull: true},
	{name: 'mutation_class', 	dataType: 'varchar(25)', notNull: true}, // todo: mutation table and foreign key?
      {name: 'mutation_type',	dataType: 'varchar(35)'},
      {name: 'locus', dataType: 'integer'},
      {name: 'new_amino_acid', dataType: 'varchar(30)'},
	{name: 'original_amino_acid', dataType: 'varchar(30)'},
	{name: 'last_edited', dataType: 'date'},
	{name: 'created_on', dataType: 'date'}
    ]
});

exports.cancers = cancers = sql.define({
	name: 'annotations_cancer',
	columns: [
	    {name: 'name', dataType: 'varchar(100)', notNull: true},
	    {name: 'color', dataType: 'varchar(7)', notNull: true},
	    {name: 'abbr', dataType: 'varchar(10)', notNull: true},
	    {name: 'last_edited', dataType: 'date'},
	    {name: 'created_on', dataType: 'date'}
	]
});

exports.references = references = sql.define({
    name: 'annotations_reference',
    columns: [
      {name: 'id', dataType: 'integer', notNull: true},
      {name: 'identifier', dataType: 'varchar(30)', notNull: true},
      {name: 'db', dataType: 'varchar(30)', notNull: true},
      {name: 'source', dataType: 'varchar(30)', notNull: true},
	{name: 'mutation_id', dataType: 'integer', notNull: true},
	{name: 'last_edited', dataType: 'date'},
	{name: 'created_on', dataType: 'date'}]
});


// *********** interaction databases ***************

exports.interaction_annotations = interaction_annotations = sql.define({
    name: 'annotations_interactionreference',
    columns: [
      {name: 'user_id',       dataType: 'varchar(40)', notNull: true},
      {name: 'interaction_id', dataType: 'integer'},
      {name: 'identifier',	dataType: 'varchar(45)', notNull: true},
      {name: 'id',       dataType: 'integer'}],
})

exports.interactions = interactions = sql.define({
    name: 'annotations_interaction',
    columns: [
	{name: 'source_id',	dataType: 'varchar(15)', notNull: true},
	{name: 'target_id',	dataType: 'varchar(15)', notNull: true},
	{name: 'input_source',	dataType: 'varchar(30)'},
	{name: 'id', dataType: 'integer', primaryKey: true}]
})

exports.votes = votes = sql.define({
    name: 'annotations_interactionvote',
    columns: [
	{name: 'id', dataType: 'integer', primaryKey: true},
	{name: 'reference_id',	dataType: 'integer', notNull:true},
	{name: 'user_id', dataType: 'varchar(40)', notNull: true},
	{name: 'is_positive', dataType: 'smallint', notNull: true}]
})

exports.users = users = sql.define({
    name: 'auth_user',
    columns: [
	{name: 'id', dataType: 'serial', primaryKey: true},
	{name: 'password',	dataType: 'varchar(128)', notNull: true},
	{name: 'last_login', dataType: 'timestamp'},
	{name: 'username', dataType: 'varchar(30)', notNull: true},
	{name: 'first_name', dataType: 'varchar(30)', notNull: true},
	{name: 'last_name', dataType: 'varchar(30)', notNull: true},
	{name: 'email', dataType: 'varchar(254)', notNull: true},
	{name: 'is_staff', dataType: 'boolean', notNull: true},
	{name: 'is_superuser', dataType: 'boolean', notNull: true},
	{name: 'is_active', dataType: 'boolean', notNull: true},
	{name: 'date_joined', dataType: 'timesamp', notNull: true}
    ]	
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

		    subannos = [interaction_annotations, interactions, votes];

		    subannos.forEach( function (thisTable) {
			createQuery = thisTable.create().ifNotExists()
		    });
		});
	    });
	}
    });
}

// export table schemas

// a "view" on aberration sources
//exports.aber_sources_view = references.joinTo(annotations).on(references.id.equals(annotations.reference_id));

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

exports.getColumnNames = function(tableDef) {
    return tableDef.columns.map(function(c) {return c.name;});
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
