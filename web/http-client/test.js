var client = require('./client');

// client('http://localhost:3000', function (error, response, body) {
// client('http://www.baidu.com', function (error, response, body) {
client('http://lellansin.com/wp-content/uploads/test.html', function (error, response, body) {
  console.log('error:', error); // Print the error if one occurred
  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  console.log('body:', body); // Print the HTML for the Google homepage.
});
