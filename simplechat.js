Messages = new Meteor.Collection("messages");
Users = new Meteor.Collection("users");

if (Meteor.is_client) {
  Template.chat.messages = function () {
    var messages = Messages.find({user: { $exists: true }, text: { $exists: true }, date: { $exists: true}, formatted_date: { $exists: true} }, { sort: {date: 1} });
    var handle = messages.observe({
      added: function (message) {
        var new_size = 25 * Messages.find().count();
        $('#chat').animate({ scrollTop: new_size }, 1);
      }
    });
    Meteor.defer(function () {
      if (Session.equals("scroll", true)) {
        var new_size = 25 * Messages.find().count();
        $('#chat').animate({ scrollTop: new_size }, 1);
        $('#input').focus();
        Session.set("scroll", false);
      }
    });
    return messages;
  };

  Template.chat.users = function () {
    var users = Users.find({name: { $exists: true }}, { sort: {name: 1} });
    return users;
  };

  Template.register.signed_in = Template.chat.signed_in = function () {
    var logged_in = (Session.get("user") ? true : false);

    if (logged_in) {
      Meteor.defer(function () {
        var new_size = 25 * Messages.find().count();
        $('#chat').animate({ scrollTop: new_size }, 1);
        $('#input').focus();
      });
    } 
    return logged_in;
  };

  Template.register.warning = function () {
    return Session.get('warning');
  };

  Template.register.events = {
    'submit form': function (event) {
      var registerbox = $('#register'),
          username = registerbox.val(),
          now = (new Date()).getTime();

      if (username === "") {
        Session.set('warning', 'Please enter a valid username.');
      } else if (Users.findOne({name: username})) {
        Session.set('warning', 'Username is already taken. Please choose another.');
      } else if (username.length > 9) {
        Session.set('warning', 'Username is too long. Please choose a username under 9 characters.');
      } else {
        Session.set('warning', null);
        Session.set("user", username);
        Session.set("scroll", true);
        Users.insert({name: username, last_seen: now});
      }      
      
      event.preventDefault();
      event.stopPropagation();
    }
  };

  Template.chat.events = {
    'submit form': function (event) {
      var inputbox = $('#input'),
          new_message = inputbox.val(),
          date = new Date(),
          hours = date.getHours(),
          minutes = date.getMinutes(),
          suffix = "AM";

      if (hours >= 12) {
        suffix = "PM";
        hours = hours - 12;
      }
      
      if (hours == 0) {
        hours = 12;
      }

      if (minutes < 10) {
        minutes = "0" + minutes;
      }

      var formatted_date = hours + ":" + minutes + " " + suffix;

      Messages.insert({user: Session.get("user"), text: new_message, date: date, formatted_date: formatted_date});
      
      inputbox.val('');

      event.preventDefault();
      event.stopPropagation();
    }
  };

  Meteor.setInterval(function () {
    var username = Session.get('user');
    if (username) {
      Meteor.call('keepalive', username);
    }
  }, 5000);

  Meteor.startup(function () {
    $('#register').focus();
  });
}

if (Meteor.is_server) {
  Meteor.startup(function () {});

  Meteor.setInterval(function () {
    var now = (new Date()).getTime();

    Users.find({last_seen: {$lt: (now - 60 * 1000)}}).forEach(function (user) {
      Users.remove(user._id);
    });
  });

  Meteor.methods({
    keepalive: function (user) {
      var now = (new Date()).getTime();

      if (!Users.findOne({name: user})) {
        Users.insert({name: user, last_seen: now});
      } else {
        Users.update({name: user}, {$set: {last_seen: now}});
      }
    }
  });
}