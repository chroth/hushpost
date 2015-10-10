var express = require('express');
var app = express();
var server = require('http').createServer(app);
var uuid = require('node-uuid');
var bodyParser = require('body-parser');
var io = require('socket.io')(server);


//
// CONFIGURATION
//
var config = {
  port: process.env.PORT || 3000,
};


//
// MIDDLEWARE
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

var defaultRoom = {
  keys: [],
  maxKeys: 2,
};
var rooms = {};


//
// CONTROLLERS
//

io.on('connection', function(socket) {
  // TODO: Use rooms...
  var room;
  var hasAddedKey = true;

  //
  // New message
  //
  socket.on('new message', function(data) {
    socket.broadcast.emit('new message', {
      recipient: data.recipient,
      message: data.message,
    });
  });

  //
  // New user
  //
  socket.on('new user', function(data) {
    socket.publicKey = data.publicKey;
    room = defaultdict(rooms[data.roomId], defaultRoom);
    console.log(data.roomId, room);
    if (room.keys.length >= room.maxKeys) {
      socket.emit('room full');
      room = undefined;
      return;
    }
    room.keys.push(data.publicKey);

    console.log('emit login');
    socket.emit('login', {
      keys: room.keys,
    });

    console.log('emit room updated');
    socket.broadcast.emit('room updated', {
        keys: room.keys,
    });
    console.log('user joined');
    socket.broadcast.emit('user joined');
  });

  socket.on('disconnect', function() {
    if (room) {
      delete room.keys[room.keys.indexOf(socket.publicKey)];
      socket.broadcast.emit('room updated', {
        keys: room.keys,
      });
      socket.broadcast.emit('user left');
    }
  });
});


//
// Index
//
app.get('/', function (req, res) {
  // TODO: Present visitors with info and possiblity to create room
  res.redirect(`/v/${uuid.v4()}`);
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
        <form id="message-form">
          <input type="text" id="message" class="form-control message-box" placeholder="Enter your message and press enter..." disabled>
        </form>
      </div>
    </div>

    <script data-main="/js/client.js" src="/js/require.js"></script>
  </body>
  </html>`;

  res.send(body);
});


//
// START UP
//
server.listen(config.port, function () {
  var host = server.address().address;
  console.log('Example app listening at http://%s:%s', host, config.port);
});

