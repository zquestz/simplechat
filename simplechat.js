Messages = new Meteor.Collection("messages");

if (Meteor.is_client) {
  Template.chat.messages = function () {
    var messages = Messages.find({text: { $exists: true }, date: { $exists: true}, formatted_date: { $exists: true} }, { sort: {date: 1} });
    var handle = messages.observe({
      added: function (message) {
        var new_size = 25 * Messages.find().count();
        $('#chat').animate({ scrollTop: new_size }, 1);
      }
    });
    return messages;
  };

  Template.chat.events = {
    'submit form': function (event) {
      var inputbox = $('#input').first(),
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
        minutes = "0" + minutes
      }

      var formatted_date = hours + ":" + minutes + " " + suffix;

      Messages.insert({text: new_message, date: date, formatted_date: formatted_date});
      
      inputbox.val('');

      event.preventDefault();
      event.stopPropagation();
    }
  };
}

if (Meteor.is_server) {
  Meteor.startup(function () {});
}