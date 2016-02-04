/* Uses the slack button feature to offer a real time bot to multiple teams */
var Botkit = require('botkit');

var clientId = process.env.client_id;
var clientSecret = process.env.client_secret;
var port = process.env.port || "1337";

if (!clientId || !clientSecret || !port) {
  console.log('Error: Specify clientId clientSecret and port in environment');
  process.exit(1);
}


var controller = Botkit.slackbot({
  json_file_store: './db_slackbutton_bot/',
}).configureSlackApp(
  {
    clientId: clientId,
    clientSecret: clientSecret,
    scopes: ['bot'],
  }
);

controller.setupWebserver(port,function(err,webserver) {
  controller.createWebhookEndpoints(controller.webserver);

  controller.createOauthEndpoints(controller.webserver,function(err,req,res) {
    if (err) {
      res.status(500).send('ERROR: ' + err);
    } else {
      res.send('Success!');
    }
  });
});


// just a simple way to make sure we don't
// connect to the RTM twice for the same team
var _bots = {};
function trackBot(bot) {
  _bots[bot.config.token] = bot;
}

controller.on('create_bot',function(bot,config) {

  if (_bots[bot.config.token]) {
    // already online! do nothing.
  } else {
    bot.startRTM(function(err) {

      if (!err) {
        trackBot(bot);
      }

      bot.startPrivateConversation({user: config.createdBy},function(err,convo) {
        if (err) {
          console.log(err);
        } else {
          convo.say('I am a bot that has just joined your team');
          convo.say('You must now /invite me to a channel so that I can be of use!');
        }
      });

    });
  }

});


// Handle events related to the websocket connection to Slack
controller.on('rtm_open',function(bot) {
  console.log('** The RTM api just connected!');
});

controller.on('rtm_close',function(bot) {
  console.log('** The RTM api just closed');
  // you may want to attempt to re-open
});

//main logic
var urx = require('./lib/urx');
var COUNT = 5;

function airBnbReact(bot, message, keywords) {
  urx.setApiKey("XuxoT370mZZQq86+dVrV7WuLk16nR0x6hC8dLvcew079lcCPXLQBnpsHQ9nhrv6NiVJLYAC+VHwsxRXNA8v/QQ==|GMi0uG4zDp0kGy3d7YfpS4N8CtOkO3lp");
  urx.search(keywords, function(response) {
    for(var i = 0; i < COUNT; ++i) {
      (function(j) {
      setTimeout(function() {
        var searchResult = response.results[j];
        var text = searchResult.entityData.url
        bot.reply(message, text);
      }, j * 10);
      })(i);
    }
   }, function(req, errorMessage) {
          // SEARCH FAILURE HANDLER
          console.log(errorMessage);
          // res.json({text: "oops, could not find it"});
   });
};

controller.hears(['(.*)'],'direct_message,direct_mention,mention',function(bot, message) {
  var keywords = message.match[0] + " domain:airbnb.com";
  airBnbReact(bot, message, keywords)
});

controller.storage.teams.all(function(err,teams) {

  if (err) {
    throw new Error(err);
  }

  // connect all teams with bots up to slack!
  for (var t  in teams) {
    if (teams[t].bot) {
      var bot = controller.spawn(teams[t]).startRTM(function(err) {
        if (err) {
          console.log('Error connecting bot to Slack:',err);
        } else {
          trackBot(bot);
        }
      });
    }
  }

});
