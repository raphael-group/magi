// Import required modules
var mongoose = require( 'mongoose' ),
	Database = require('./db');

// Create schemas to hold a data matrix
var DataMatrixRowSchema = new mongoose.Schema({
	gene: {type: Array, required: true},
	dataset_id: {type: mongoose.Schema.Types.ObjectId, required: true},
	row: {type: Array, required: true},
	updated_at: { type: Date, default: Date.now, required: true }
});

Database.magi.model( 'DataMatrixRow', DataMatrixRowSchema );

// 