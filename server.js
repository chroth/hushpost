var express = require('express');
var app = express();
var uuid = require('node-uuid');
var bodyParser = require('body-parser');

//
// CONFIGURE
//

// Parse body
app.use(bodyParser.json());
// Static files
app.use(express.static('public'));
// Log
app.use(function (req, res, next) {
  console.log(req.method + ' ' + req.url);
  next();
});

//
// HELPERS
//
function defaultdict(obj, def) {
  return obj ? obj : def;
}

//
// Chat data
//

var defChat = {
  people: [],
  messages: []
};
var chats = {};


//
// CONTROLLERS
//

//
// Index
//
app.get('/', function (req, res) {
  res.redirect(`/v/${uuid.v4()}`);
});

//
// Get message
//
app.get('/m/:chatId', function (req, res) {
  var chat = defaultdict(chats[req.param.chatId], defChat);

  res.json(chat.messages);
});

//
// Post message
//
app.post('/m/:chatId', function (req, res) {
  var chat = defaultdict(chats[req.param.chatId], defChat);

  chat.messages.push({m: req.body.message, s: req.body.publicKey});

  res.json({});
});

//
// Get chat users
//
app.get('/c/:chatId', function (req, res) {
  var chat = defaultdict(chats[req.param.chatId], defChat);
  res.json(chat.people);
});

//
// Set chat user
//
app.post('/c/:chatId', function (req, res) {
  var chat = defaultdict(chats[req.param.chatId], defChat);

  if (chat.people.length <= 2) {
    chat.people.push(req.body.publicKey);
    res.json({});
  } else {
    res.status(400).json({message: 'Chat room already full.'});
  }
});

//
// View chat
//
app.get('/v/:chatId', function (req, res) {
  let body = `<html>
  <head>
    <title>Hushpost</title>
    <link rel="stylesheet" type="text/css" href="/css/bootstrap.min.css">
    <link rel="stylesheet" type="text/css" href="/css/main.css">
  </head>
  <body>
    <div class="chat-container">
      <div id="chat" class="chat-message" data-chat-id="${req.params.chatId}">
        Loading...
      </div>

      <div class="chat-controls">
        <form class="form-inline" id="message-form">
          <input type="text" id="message" class="form-control message-box">
          <button class="btn btn-default" id="postMessage">Send</button>
        </form>
      </div>
    </div>

    <script data-main="/js/client.js" src="/js/require.js"></script>
  </body>
  </html>`;

  res.send(body);
});

// Boot server
var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});

