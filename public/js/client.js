requirejs.config({baseurl: '/js'});

define(['axios.min', 'jsencrypt'],
function(request, JSEncrypt) {
  // DOM
  var chat = document.getElementById('chat');
  var chatId = chat.getAttribute('data-chat-id');
  var form = document.getElementById('message-form');
  var messageTextBox = document.getElementById('message');

  // User data
  var user = {};
  var recipient;

  // Encryption
  var generateKeys = function (next) {
    var crypt = new JSEncrypt({default_key_size: 2048});
    crypt.getKey();

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

  var encryptOutgoingMessage = function(message) {
    var crypt = new JSEncrypt();
    crypt.setPublicKey(recipient);
    return crypt.encrypt(message);
  };

  // API
  function addUser(key) {
    user = key;
    return request.post('/c/' + chatId, {publicKey: key.publicKey});
  }

  function getUsers(next) {
    return request.get('/c/' + chatId);
  }

  function postMessage(msg) {
    return request.post('/m/' + chatId, {message: msg, publicKey: recipient.publicKey});
  }

  function getMessages() {
    return request('/m/' + chatId);
  }

  function updateMessages() {
    getMessages()
      .then(function(res) {
        var messages = res.data;
        console.log(messages);
        chat.innerText = "";
        messages.forEach(function(message) {
          var txt = decryptIncomingMessage(message.m);
          if (txt) {
            chat.innerText += txt;
          }
        });
      });
  }

  function getRecipient() {
    getUsers()
      .then(function(res) {
        var people = res.data;
        var recipients = people.filter(function(person) {
          return person !== user.publicKey;
        });

        if (recipients.length > 0) {
          recipient = recipients[0];
          chat.innerText += "Person added chat.";
        }
      });
  }

  // Chat
  function hasInitedChat() {
    chat.innerText = 'Ready';
    form.addEventListener('submit', function(event) {
      event.preventDefault();
      var message = messageTextBox.value;
      postMessage(encryptOutgoingMessage(message))
        .then(updateMessages);
    });

    setInterval(updateMessages, 1000);
    setInterval(getRecipient, 1000);
  }

  function failedToInitChat() {
    chat.innerText = 'Failed to init chat';
  }

  // Add user (self)
  generateKeys(function(key) {
    addUser(key)
      .then(hasInitedChat)
      .catch(failedToInitChat);
  });
});

