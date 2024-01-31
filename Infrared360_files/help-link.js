var helpLink = {
  init: function(helpId, selector) {
    $(selector || '.learn-more').on('click', function() {
      openWindow(helpId, 'Infrared360_Help', 1000, 800);
    });
  },
};
