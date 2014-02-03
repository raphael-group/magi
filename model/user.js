// Load required modules
var mongoose = require( 'mongoose' );

// create a user model
var UserSchema = new mongoose.Schema({
  googleId: Number,
  name: String,
  email: String
});

mongoose.model( 'User', UserSchema );