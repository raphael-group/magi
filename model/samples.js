// Import required modules
var mongoose = require( 'mongoose' ),
    Database = require('./db');

// Create GeneSet schema and add it to Mongoose
var SampleSchema = new mongoose.Schema({
	name: { type: String, required: true},
	dataset_id: { type: mongoose.Schema.Types.ObjectId, required: true},
	mutations: { type: Array, required: true}
});

Database.magi.model( 'Sample', SampleSchema );
