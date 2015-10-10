requirejs.config({baseurl: '/js'});

define(['axios.min', 'jsencrypt', '/socket.io/socket.io.js'],
function(request, JSEncrypt, io) {
  //
  // DOM
  //
  var chat = document.getElementById('chat');
  var roomId = chat.getAttribute('data-chat-id');
  var form = document.getElementById('message-form');
  var messageTextBox = document.getElementById('message');

  function addMessageToChat(msg) {
    chat.innerText += '\n' + msg;
    chat.scrollTop = chat.scrollHeight;
  }

  function setupChatEvents() {
    form.addEventListener('keypress', function(event) {
      if (event.keyCode === 13) {
        event.preventDefault();
        postMessage(messageTextBox.value);
        messageTextBox.value = "";
      }
    });
  }

  //
  // User data
  //
  var socket = io();
  var user = {};
  var recipients = [];

  //
  // Encryption helpers
  //
  var generateKey = function (next) {
    var crypt = new JSEncrypt({default_key_size: 2048});
    crypt.getKey(); // Generates key

    next({
      privateKey: crypt.getPrivateKey(),
      publicKey: crypt.getPublicKey()
    });
  };

  var decryptIncomingMessage = function(message) {
    var crypt = new JSEncrypt();
    crypt.setPrivateKey(user.privateKey);
    return crypt.decrypt(message);
  };

  var encryptOutgoingMessage = function(message, recipient) {
    var crypt = new JSEncrypt();
    crypt.setPublicKey(recipient);
    return crypt.encrypt(message);
  };

  //
  // postMessage
  //
  function postMessage(msg) {
    addMessageToChat('> ' + msg);
    recipients.forEach(function(recipient) {
      var message = encryptOutgoingMessage(msg, recipient);

      socket.emit('new message', {
        recipient: recipient,
        message: message,
      });
    });
  }

  //
  // updateRoom
  //
  function updateRoom(keys) {
    recipients = keys.filter(function(key) {
      return key !== user.publicKey;
    });
  }

  //
  // Socket events
  //
  socket.on('new message', function(data) {
    if (data.recipient === user.publicKey) {
      var txt = decryptIncomingMessage(data.message);
      if (txt) {
        addMessageToChat('> ' + txt);
      }
    }
  });

  socket.on('room updated', function getRecipient(data) {
    updateRoom(data.keys);
  });

  socket.on('user joined', function() {
    addMessageToChat('A user joined room.');
  });

  socket.on('user left', function() {
    addMessageToChat('A user left room. Please kill session.');
  });

  socket.on('login', function(data) {
    chat.innerText = 'You joined the chat.';

    updateRoom(data.keys);
    setupChatEvents();
  });

  socket.on('room full', function() {
    chat.innerText = 'Failed to init chat - room is full.';
  });

  //
  // Init
  //
  generateKey(function(key) {
    // Set focus on message text box.
    messageTextBox.removeAttribute("disabled");
    messageTextBox.select();
    // Set user
    user = key;
    // Add self to room
    socket.emit('new user', {
      roomId: roomId,
      publicKey: key.publicKey,
    });
  });
});

