var mongoose = require('mongoose');
var bluebird = require('bluebird');
var User = require('./db-user.js');

// Table Schema 
var questionSchema = mongoose.Schema({
  question: {type: String},
  username: {type: String},
  roomname: {type: String}
});

var Question = mongoose.model('Question', questionSchema);

module.exports = Question;