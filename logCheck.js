// Used to verify that MAGI use logs are being stored
var mongoose = require('mongoose'),
    Database = require('./model/db'),
    Log = require('./model/log');

log = Database.logDB.model('Log');

log.find({}, function(err, docs) {
  console.log("The number of logs is", docs.length);

  var latestLog = docs[docs.length - 1],
      latestTime = Date(+latestLog.sessionId);

  console.log("The last log was created on", latestTime);
  console.log("The last log interaction count is", latestLog.log.length);

  process.exit();
});
