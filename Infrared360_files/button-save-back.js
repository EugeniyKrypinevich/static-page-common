$(document).ready(function() {
  $('*[id^=cancel_btn]').click(function() {
    redirectOnComplete();
  });

  if ($('*[id^=edit_btn]').length == 0) {
    $('*[id^=save_btn]').click(function() {
      saveButtonAction($("#" + formId).find('input[id="actionTo"]').val() || 'save');
    });

    return null; // exit document.ready()
  }

  $('*[id^=edit_btn]').click(function() {
    enableInput();
  });

  $('*[id^=save_btn]').click(function() {
    saveButtonAction('save');
  });

  $('*[id^=save_schedule_btn]').click(function() {
    saveButtonAction('saveSchedule', false);
  });

  $('*[id^=save_unschedule_btn]').click(function() {
    saveButtonAction('saveUnschedule');
  });

  $('*[id^=save_reschedule_btn]').click(function() {
    saveButtonAction('saveReschedule');
  });

  $('*[id^=save_monitor_btn]').click(function() {
    saveButtonAction('startMonitor');
  });

  $('*[id^=save_demonitor_btn]').click(function() {
    saveButtonAction('stopMonitor');
  });

  $('*[id^=save_remonitor_btn]').click(function() {
    saveButtonAction('resetMonitor');
  });

    if (disableInputs) {
        disableInput();
    } else {
        enableInput();
    }

  // Tried adding this to the actual page but did not work (top and bottom of the page)
  if (/queue-.*-modify/.test(tabFormName)) {
    $('div.modal-dialog :input').each(function() {
      $(this).removeAttr('disabled');
    });
  } else if (/channel-.*-modify/.test(tabFormName)) {
    $('div.modal-dialog :input').each(function() {
      $(this).removeAttr('disabled');
    });
  }
});
