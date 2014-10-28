var mongoose = require( 'mongoose' ),
    Database = require('./db');

var LogSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  sessionId: String,
  log: Array,

  documentSize: Array,
  windowSize: Array,
  vizSizes: Array,
  vizLocations: Array,

  tooltips: Array,

  genes: [String],
  datasets: [String],
  showDuplicates: String,

  annotations: Array
});

// Register the Schema with mongoose
Database.logDB.model('Log', LogSchema);

exports.startLog = function(logObj, userId) {
  if (logObj == undefined) return;
  // Get user information
  var sessionId = logObj.sessionId || null;

  var barebone = {
    // User Information
    userId: userId,
    sessionId: sessionId,
    log: [],

    // Size Information
    documentSize: [logObj.documentSize],
    windowSize: [logObj.windowSize],
    vizSizes: [logObj.vizSizes],
    vizLocations: [logObj.vizLocations],

    tooltips: [],

    // Query Information
    genes: logObj.genes,
    datasets: logObj.datasets,
    showDuplicates: logObj.showDuplicates
  };

  // Create the log
  var log = Database.logDB.model('Log');
  log.create(barebone, function(e, s) {
    if(e) {
      console.log('Undefined log creation');
      console.log(e);
    } else {
      console.log('new log made. Lookup:', userId, sessionId);
    }
  });
}

exports.extendLog = function(newInfo, userId) {
  var sessionId = newInfo.sessionId || null;

  var documentSize = newInfo.documentSize,
      windowSize = newInfo.windowSize,
      vizSizes = newInfo.vizSizes,
      vizLocations = newInfo.vizLocations,
      annotations = newInfo.annotations,
      logExtension = newInfo.log,
      tooltips = newInfo.tooltips;

  var log = Database.logDB.model('Log'),
      query = {userId: userId, sessionId: sessionId};
  log.find(query, function(err, logs) {
    if (err || logs.length == 0) {
      console.log('Could not find interaction logs. Lookup:', userId, sessionId);
    } else {
      var l = logs[0];

      var pushData = [
        ['log', logExtension],
        ['documentSize', documentSize],
        ['windowSize', windowSize],
        ['vizSizes', vizSizes],
        ['vizLocations', vizLocations],
        ['tooltips', tooltips]
      ];

      function pushDataFn(key, newInfo) {
        if (newInfo) {
          l[key].push.apply(l[key], newInfo);
          l.markModified(key);
        }
      }

      pushData.forEach(function(d) { pushDataFn(d[0], d[1]); });

      l.save();
      console.log('extended Log!');
    }
  });
}

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

  var log = Database.logDB.model('Log');

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