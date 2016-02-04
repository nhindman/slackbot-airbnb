var request = require('request');


var url = 'https://slackbot-airbnb.herokuapp.com/';
request(url, function() {
  console.log('requiest done!');
});
