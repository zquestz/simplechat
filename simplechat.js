Messages = new Meteor.Collection("messages");
Users = new Meteor.Collection("users");
scrollTimer = null;

if (Meteor.is_client) {
  Meteor.subscribe("messages");
  Meteor.subscribe("users");

  Template.chat.messages = function () {
    var messages = Messages.find({user: { $exists: true }, text: { $exists: true }, date: { $exists: true} }, { sort: {date: 1} });
    var handle = messages.observe({
      added: function (message) {
        Template.chat.scroll();
      }
    });
    
    if (Session.equals("init_chat", true)) {
      Meteor.defer(function () {
        Session.set("init_chat", false);
        $('#input').focus();
        Template.chat.scroll();
      });
    }

    return messages;
  };

  Template.chat.scroll = function() {
    clearTimeout(scrollTimer);

    scrollTimer = setTimeout(function () {
      $('#chat').stop();
      $('#chat').animate({ scrollTop: 99999999 }, 10);
    }, 50);
  }

  Template.chat.formatted_date = function(date) {
    if (date.constructor === String) {
      var date = new Date(date);
      date.setMinutes(date.getMinutes() - date.getTimezoneOffset());

      var hours = date.getUTCHours(),
          minutes = date.getUTCMinutes(),
          suffix = "AM";

      if (hours >= 12) {
        suffix = "PM";
        hours -= 12;
      }

      if (hours == 0) {
        hours = 12;
      }

      if (minutes < 10) {
        minutes = "0" + minutes;
      }

      return (hours + ":" + minutes + " " + suffix);
    }
  };

  Template.chat.users = function () {
    var users = Users.find({name: { $exists: true }}, { sort: {name: 1} });
    return users;
  };

  Template.register.signed_in = Template.chat.signed_in = function () {
    var user_id = Session.get("user_id"),
        verified = Session.get("verified");

    if (verified) {
      return true;
    }

    if (user_id) {
      if (Users.findOne(user_id)) {
        Session.set("verified", true);
        return true;
      }
    }

    return false;
  };

  Template.register.warning = function () {
    var registerbox = $('#register'),
        username = registerbox.val(),
        warning = "";

    if (username === "") {
      warning = 'Please enter a valid username.';
    } else if (username === undefined) {
      warning = 'An error occurred. Please try again.'
    } else if (Users.findOne({name: username})) {
      warning = 'Username is already taken. Please choose another.';
    } else if (username.length > 9) {
      warning = 'Username is too long. Please choose a username under 9 characters.';
    }

    $('#warning').text(warning);

    return warning;
  };

  Template.register.events = {
    'submit form': function (event) {
      var registerbox = $('#register'),
          username = registerbox.val(),
          now = (new Date()).getTime();

      if (Template.register.warning() === "") {
        Meteor.call('add_user', username, function (error, result) {
          if (error) {
            alert(error);
          } else {
            Session.set("user_id", result);
            Session.set("init_chat", true);
          }
        });
      }      
      
      event.preventDefault();
      event.stopPropagation();
    }
  };

  Template.chat.events = {
    'submit form': function (event) {
      var inputbox = $('#input'),
          new_message = inputbox.val(),
          date = new Date();

      if (new_message !== '') {
        Meteor.call('add_msg', Session.get("user_id"), new_message);
      }

      inputbox.val('');

      event.preventDefault();
      event.stopPropagation();
    }
  };

  Meteor.setInterval(function () {
    var user_id = Session.get('user_id');
    if (user_id) {
      Meteor.call('keepalive', user_id);
    }
  }, 1000);

  Meteor.startup(function () {
    $('#register').focus();
  });
}

if (Meteor.is_server) {
  function disableClientMongo() {
    _.each(['messages', 'users'], function(collection) {
      _.each(['insert', 'update', 'remove'], function(method) {
        Meteor.default_server.method_handlers['/' + collection + '/' + method] = function() {};
      });
    });
  };

  Meteor.startup(function () {
    disableClientMongo();
  });

  Meteor.publish("messages", function () {
    return Messages.find({}, {limit: 1024});
  });

  Meteor.publish("users", function () {
    return Users.find({}, {limit: 5000});
  });

  Meteor.setInterval(function () {
    var now = (new Date()).getTime();
    var date = (new Date());
    date.setSeconds(date.getSeconds() + 10);

    Users.remove({last_seen: {$lt: (now - 60 * 1000)}});
  }, 1000);

  Meteor.methods({
    keepalive: function (user_id) {
      var now = (new Date()).getTime();

      if (Users.findOne(user_id)) {
        Users.update(user_id, {$set: {last_seen: now}});
      }
    },
    add_msg: function (user_id, msg) {
      if (user = Users.findOne(user_id)) {
        Messages.insert({user: user.name, text: msg, date: new Date()});
      }
    },
    add_user: function(username) {
      var now = (new Date()).getTime();
      var user_id = Users.insert({name: username, last_seen: now});
      return user_id;
    }
  });
}