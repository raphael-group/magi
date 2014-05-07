// Import required modules
var mongoose = require( 'mongoose' );

// Create session log schema and add it to Mongoose
var LogSchema = new mongoose.Schema({
  start: Number, // start session date
  end: Number, // end session date
  id: String,
  height: Number, // height of app
  width: Number, // width of app
  log: Object,
  genes: Array,
  datasets: Array, // array of datasets: {name:'', uploaded:true/false}
  annotations: Array // annotation id for each annotation created
});

mongoose.model( 'Log', LogSchema );

exports.saveLog = function(logObj, callback) {
  if (logObj == undefined) {
    console.log('Undefined log sent to server');
  }
  // functions to write to DB: save to update; create to update
  // To-do: fix this
  var log = mongoose.model('Log');

  log.create(logObj, function (err, small) {if (err) console.log('Undefined log creation') });
}