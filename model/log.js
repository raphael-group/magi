var mongoose = require( 'mongoose' ),
    db = require('./db');

var LogSchema = new mongoose.Schema({
  annotations: Array, // annotation id for each annotation created
  start: Number, // start session date
  end: Number, // end session date
  userId: mongoose.Schema.Types.ObjectId,
  height: Number, // height of app
  width: Number, // width of app
  log: Object,
  genes: Array,
  datasets: Array, // array of datasets: {name:'', uploaded:true/false}
  showDuplicates: String,
  vizSizes: Array
});

// Register the Schema with mongoose
db.logDB.model('Log', LogSchema);

var shouldWeStoreLogs = false;
exports.enableLogging = function(state) {
  shouldWeStoreLogs = state;
  console.log('Server is logging interactions?:', state);
}
exports.isLoggingEnabled = function() {
  return shouldWeStoreLogs;
}

// Update or create a document for a provided user's log
// logObj - LogSchema
// userId - UserSchema Object
// callback - function
exports.saveLog = function(logObj, userId, callback) {
  if (shouldWeStoreLogs == false) {
    if (callback != undefined) {
      return callback();
    }
  }
  if (logObj == undefined) {
    console.log('Undefined log sent to server');
  }

  var log = db.logDB.model('Log');

  logObj.userId = userId;

  // Parameters to use when checking if a session has already started to be logged
  // Prevents creating duplicate session logs
  findParams = {userId: userId, start:logObj.start, genes:logObj.genes, datasets:logObj.datasets};

  // Determine if a session log has already been created. if not: create; else: update
  log.find(findParams, function (err, logs) {
    if (err) console.log('Could not find interaction logs.');
    if(logs.length == 0) {
      log.create(logObj, function(e, s) { if(err) console.log('Undefined log creation') });
    } else {
      log.update(findParams, { $set: { end: logObj.end, log: logObj.log }}, function(e, r) {});
    }
  });
  if (callback != undefined) {
    return callback();
  }
}