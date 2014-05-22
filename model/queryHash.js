var mongoose = require( 'mongoose' );

var QueryHashSchema = new mongoose.Schema({
  queryHash: String, // sha1 hash for each user
  query: String // true if logging enabled; false if disabled
});

// Register the Schema with mongoose
mongoose.model('QueryHash', QueryHashSchema);