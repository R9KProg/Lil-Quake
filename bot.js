var irc = require("irc");
var mysql = require("mysql");
var db = require("./db.js");
var fs = require("fs");
var polls = require("./polls.json");

var config = {
  channels: ["#r9kprogtest", "#r9kprog", "#r9k"],
  server: "irc.rizon.net",
  botName: "Lil`Quake",
  userName: "Lil`Quake",
  realName: "Lil`Quake"
};

var bot = new irc.Client(config.server, config.botName, {
  channels: config.channels, userName: config.userName, realName: config.realName
});

function save(fileName, file) {
  fs.writeFile(fileName + '.json', JSON.stringify(file), function(err) {
    if (err) return console.log(err);
  });
}

/* Listeners */
// Greet those who join.
/* Disabled for now 
bot.addListener("join", function (channel, who) {
  if (who !== config.botName) {
    bot.say(channel, who + ", 'Sup nigga.");
  }
});
*/
// Mention respones
bot.addListener('message#', function(nick, to, text, message) {
  if (text.includes(config.botName)) {
    // Log messages to bot
    console.log(nick + ": " + text);
    
    // Commands command
    var commie = /\b(help|commands)\b/i;
    if (text.match(commie)) {
      bot.say(to, "Right now all I can do is tell you who's in the bot wars and KILL NIGGAS");
    }

    // Response to greeting
    var greetings = /\b(ay+|hi|hello|sup|yo)\b/i;
    if (text.match(greetings)) {
      bot.say(to, "Hi " + nick + "! Hope you're doing well.");
    }

    // Say something to someone.
    var say = /say (.*) to (\S*)/i;
    if (text.match(say)) {
      var sayres = text.match(say);
      bot.say(to, sayres[2] + ": " + sayres[1]);
    }
    
    // Participants
    var partregx = /\b(participa.*|bot wars|who'?s in)\b/i; 
    if (text.match(partregx)) {
      db.connection.query('SELECT user, bot, timestamp from bot_wars order by timestamp asc', function(err, rows) {
        bot.say(to,
          "The bot wars are a bot competition.\n" +
          "The bots will be rated on their ease of use, originality, complexity, realism and usefulness.\n" +
          "All bots must have source code information publicly available to be considered in the final grading.\n" +
          "The current participants and their bots are:\n"
        );
        for (var i = 0; i < rows.length; i++) {
          bot.say(to, rows[i]['user'] + " with bot " + rows[i]['bot']);
        }
        bot.say(to, "Participant list updated " + rows[rows.length - 1]['timestamp']);
      });
    }

    // GAT
    var kill = /kill (\S*)/i;
    if (text.match(kill)) {
      var killres = text.match(kill);
      bot.action(to, "GATS down " + killres[1] + " with an UZI.");
      bot.say(to, "BRRAAP BRRAAP PEW PEW");
    }

    // Submit
    var submit = /(submit|enter) (\S*)/i;
    if (text.match(submit)) {
      var entry = {
        user: nick,
        bot: text.match(submit)[2],
        github: '???',
        information: '???'
      };
      db.connection.query('insert into bot_wars set ?', entry);
    }

    // Update github or info
    var update = /update (\S*) (git|info) (.*)/i;
    if (text.match(update)) {
      var updateres = text.match(update);
      if (updateres[2] == 'git') {
        db.connection.query('update bot_wars set github = ? where bot = ?', [updateres[3], updateres[1]]);
      }
      else {
        db.connection.query('update bot_wars set information = ? where bot = ?', [updateres[3], updateres[1]]);
      }
    }

    process.on('uncaughtException', function (err) {
      console.error(err);
    });

    // View all bot data
    var viewbot = /(view|info\S*|git\S*) (\S*)/i;
    if (text.match(viewbot)) {
      var viewbotres = text.match(viewbot);
      db.connection.query('select * from bot_wars where bot = ?', viewbotres[2], function(err, rows) {
        var info = rows[0];
        bot.say(to,
          "The full information for bot " + info.bot + " is:\n" +
          "Creator: " + info.user + "\n" +
          "Information last updated on: " + info.timestamp + "\n" +
          "Git repository or website/where to download: " + info.github + "\n" +
          "Other information: " + info.information
        );
      });
    }

    // Create poll
    var poll = /poll (.*) options (.*)/i;
    if (text.match(poll)) {
      var pollres = text.match(poll);
      var pollid = Object.keys(polls).length;
      var pollname = pollres[1];
      var polloptions = pollres[2].split('; ');
      if (polloptions.length >= 2) {
        for (var i = 0; i < polloptions.length; i++) {
          polloptions[i] = [polloptions[i], 0];
        }
        var pollobject = {pollid: pollid, pollname: pollname, polloptions: polloptions};
        polls[pollid] = pollobject;
        save("polls", polls);

        bot.say(to, "Now polling on topic \"" + pollres[1] + "\"\nTo vote, enter [my nick] vote [#]\nOptions:");
        for (var i = 0; i < polloptions.length; i++) {
          bot.say(to, (i + 1) + ") " + polloptions[i][0]);
        }
      }
    }

    // Vote on poll
    var vote = /vote (\d*)/i;
    if (text.match(vote)) {
      var voteres = text.match(vote);
      var pollid = Object.keys(polls).length - 1;
      var polln = polls[pollid];
      if (voteres[1] > polln.polloptions.length) {
        bot.say(to, "Invalid vote. Go fuck off and choose a real option.");
      }
      else {
        var voteid = polln.polloptions[voteres[1] - 1];
        voteid[1]++;
        save("polls", polls);
        bot.say(to, "One vote for " + voteid[0] + " | Total votes for option: " + voteid[1]);
      }
    }

    // View the results of poll
    var results = /results/i;
    if (text.match(results)) {
      var polln = polls[Object.keys(polls).length - 1];
      bot.say(to, "The results for \"" + polln.pollname + "\" as of right now are: ");
      var count = 0;
      for (var i = 0; i < polln.polloptions.length; i++) {
        bot.say(to, "Option \"" + polln.polloptions[i][0] + "\" has " + polln.polloptions[i][1] + " votes.");
        count += polln.polloptions[i][1];
      }
      bot.say(to, "Total number of votes: " + count);
    }
  }
});

console.log("Connected to " + config.channels);

