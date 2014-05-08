var mongoose = require( 'mongoose' );

var LogPermissionSchema = new mongoose.Schema({
  userHash: String, // sha1 hash for each user
  enable: Boolean // true if logging enabled; false if disabled
});

// Register the Schema with mongoose
mongoose.model('LogPermission', LogPermissionSchema);