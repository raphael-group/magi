// Import required modules
var mongoose = require( 'mongoose' ),
    Database = require('./db');

// Create domain schema and add it to Mongoose
var TranscriptSchema = new mongoose.Schema({
	name: { type: String, required: true},
	gene: { type: String, required: true},
	sequence: { type: String, required: true},
	annotations: { type: Array, required: true },
	domains: {type: {}, required: false},
	transcript_dataset_id: {type: mongoose.Schema.Types.ObjectId, required: false},
	created_at: { type: Date, default: Date.now, required: true },
});

var TranscriptDatasetSchema = new mongoose.Schema({
	name: {type: String, required: true},
	updated_at: {type: Date, default: Date.now, required: true}
});

Database.magi.model( 'Transcript', TranscriptSchema );
Database.magi.model( 'TranscriptDataset', TranscriptDatasetSchema );

// Helper function for finding transcripts
exports.find = function(transcript_names, callback){
	var Transcript = Database.magi.model( 'Transcript' );
	Transcript.find({name: {$in: transcript_names}}, callback);
}