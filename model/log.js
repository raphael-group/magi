// Import required modules
var mongoose = require( 'mongoose' );

// Create session log schema and add it to Mongoose
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

mongoose.model('Log', LogSchema);

exports.saveLog = function(logObj, userId, callback) {
  if (logObj == undefined) {
    console.log('Undefined log sent to server');
  }
  // functions to write to DB: save to update; create to update
  // To-do: fix this
  var log = mongoose.model('Log');

  logObj.userId = userId;

  findParams = {userId: userId, start:logObj.start, genes:logObj.genes, datasets:logObj.datasets};

  log.find(findParams, function (err, logs) {
    if (err) console.log('errrrror in logging');
    if(logs.length == 0) {
      console.log('New log created.');
      log.create(logObj, function(e, s) { if(err) console.log('Undefined log creation')});
    } else {
      console.log('Log udpated.');
      console.log('Num logs:');
      console.log(logs.length);
      console.log('</end num logs>');

      logs[0].end = logObj.end;
      logs[0].log = logObj.log;
    }
  });
  //log.create(logObj, function (err, small) {if (err) console.log('Undefined log creation') });
}