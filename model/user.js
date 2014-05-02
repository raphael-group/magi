// Load required modules
var mongoose = require( 'mongoose' );

// create a user model
var UserSchema = new mongoose.Schema({
  googleId: Number,
  name: String,
  email: String,
  researcherType: String,
  newsletter: Boolean,
  institution: String,
  department: String,
  other: String,
  queries: { type: Array, required: false, default: [] },
});

mongoose.model( 'User', UserSchema );