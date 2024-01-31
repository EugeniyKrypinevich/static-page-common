// Issue with sending multi-select data as array[] to Server. This plus not defining contentType on $.ajax command resolved
jQuery.ajaxSettings.traditional = true;

$(document).ready(function() {
  locateCollapseButton();
  toggleDropdown();
  addTitleForSelects('.form-control.multiple option');
  addTitleForSelects('.form-multi-select option');
  transformSelectToTheSelect2('select.form-control.searchable');
});

function addTitleForSelects(selector) {
  $(selector).each(function(){
    var option = $(this);
    var optionText = option.text();

    option.prop('title', optionText);
  });
}

function toggleDropdown() {
  $(".dropdown-toggle").on("click", function() {
    if($(".tooltip").hasClass("show")){
      $(".tooltip").switchClass("show", "hide");
    }
  });

  // Replace \/ in titles with /
  if ($("#page-title").length > 0) {
    replaceEscapedForwardSlash("#page-title");
  }
}

function replaceEscapedForwardSlash(cssSelector) {
	var text = $(cssSelector).text();
	if(text)
		$(cssSelector).text(text.replace(/\\\//g,"/"));
}

function locateCollapseButton() {
  var menu = $('.consoleMenu');
  var aside = $('.sidebar-menu');
  var logo = $('.logo-wrapper');
  var collapseButton = $('.sidebar-menu-collapse');
  var updateTime = 500;

  var lastHeight = menu.height();
  var logoHeight = logo.outerHeight();
  var asideHeight = aside.height() - logoHeight;
  var collapseButtonHeight = collapseButton.outerHeight();

  function checkHeightChange() {
    var newHeight = menu.height();

    if (lastHeight !== newHeight) {
      lastHeight = newHeight;

      if (newHeight > asideHeight) {
        collapseButton.css('top', lastHeight + logoHeight + 'px');
      } else {
        collapseButton.css('top', asideHeight + (logoHeight - collapseButtonHeight) + 'px');
      }
    }
  }

  setInterval(checkHeightChange, updateTime);
}

function toggleInfoText() {
  $('.info-button').on('click', function() {
    $(this).siblings('.message-detail').toggle();
  });
}

var blockUiIntervalID;

// IMPORTANT NOTE: Do not do global ajaxSend function because there are a lot of AJAX calls (view selection call, grid table call, etc.) being done per page
//
function startBlockUIMessage(message, callServerForMessage) {
  message = message || 'Please wait....';

  $.blockUI({ css: { opacity: 1 } });

  if (message && message.trim()) {
    $('#blockUiMessage').text(message);
  }

  if (callServerForMessage)
	  blockUiIntervalID = setInterval(getBlockUiMessage, 1000);
}

function getBlockUiMessage() {
	  $.ajax({
	    url: $('#blockUiMessageUpdate').val(),
	    dataType: 'json',
	    contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
	    timeout: ajaxTimeout,
	    data: {},
	    global: false,
	    cache: false,
	    success: function(json) {
	      $('#blockUiMessage').text(json.message);
	    },
	  });
	  return false;
}

function stopBlockUiMessage()
{
	$.unblockUI();
	clearInterval(blockUiIntervalID);
}

//util function to check if an element has a scrollbar present
$.fn.hasScrollBar = function(direction) {
  if (direction == 'vertical') {
    return this.get(0).scrollHeight > this.innerHeight();
  } else if (direction == 'horizontal') {
    return this.get(0).scrollWidth > this.innerWidth();
  }
  return false;
};

function buildSubsetMenu(json, viewOptionsMenuList, currentView, templatePath) {
  var currentViewKey = json.viewName;

  $(viewOptionsMenuList).html('');

  $.get(templatePath, function(template) {
    for (i in json.viewNames) {
      if (json.viewNames[i].myKey == currentViewKey) {
        $(currentView).html(json.viewNames[i].myValue);
      }

      var view = {
        name: json.viewNames[i].myKey,
        text: json.viewNames[i].myValue,
      };

      Mustache.parse(template); // optional, speeds up future uses
      var output = Mustache.render(template, view);
      $(viewOptionsMenuList)
        .children()
        .end()
        .append(output);
    }
  });
}

function openWindow(url, windowName, width, height) {
  //var options = 'width=' + width + ',height=' + height + ',';

  //options += 'resizable=yes,scrollbars=yes,status=no,titlebar=no,';
  //options += 'menubar=no,toolbar=no,location=no,directories=no';

	// font-family: serif;
  window.open(url);
  
  // Get 'access denied' error on IE using moveTo method

  return false;
}

function validateSession() {
  $.ajax({
    url: $('#sessionValidateUpdate').val(),
    dataType: 'json',
    contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
    timeout: ajaxTimeout,
    data: {},
    global: false,
    cache: false,
    success: function(json) {
      if (json.statusCode != '-1') {
        if (!eval(json.result.valid))
          window.location.href = CONTEXT_PATH + '/logout';
      }
    },
  });

  return false;
}

// Update Alert indicator information. How many alerts are firing
function getAlertStatus() {
  validateSession();

  // Start to show AJAX command is working
  $('#alertStatusWorkingIndicator').toggle();

  $.ajax({
    url: $('#alertStatusUpdate').val(),
    dataType: 'json',
    contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
    timeout: ajaxTimeout,
    data: {},
    global: false,
    cache: false,
    success: function(alertStatusJson) {
      $('#alertStatusLink').attr('title', alertStatusJson.urlTitle);
      $('#alertStatusLink')
        .children('.badge')
        .text(alertStatusJson.urlValue);

      if (alertStatusJson.imageSrc == 'dotGreen')
        $('#alertStatusLink')
          .children('.badge')
          .removeClass('badge-alerted');
      else
        $('#alertStatusLink')
          .children('.badge')
          .addClass('badge-alerted');

      // Stop showing AJAX command is working
      $('#alertStatusWorkingIndicator').toggle();
    },
  });

  return false;
}

function getMessageNotifications() {
  $.ajax({
    url: $('#messageNotificationUpdate').val(),
    dataType: 'json',
    contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
    timeout: ajaxTimeout,
    data: {},
    global: false,
    cache: false,
    success: function(messageNotifications) {
      displayMessageNotifications(messageNotifications);
    },
  });

  return false;
}

function deleteMessageNotification(guid, event) {
  event.stopPropagation();
  $.ajax({
    url: $('#messageNotificationDelete').val(),
    dataType: 'json',
    contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
    timeout: ajaxTimeout,
    data: { guid: guid },
    global: false,
    cache: false,
    success: function(messageNotifications) {
      displayMessageNotifications(messageNotifications);
    },
  });

  return false;
}

function displayMessageNotifications(messageNotifications) {
  const notificationsMenu = $('#notificationsMenu'),
    notificationsMenuList = $('#notificationsMenuList'),
    notificationsBadge = notificationsMenu.find('.badge');

  notificationsBadge.text(messageNotifications.length);
  notificationsMenuList.empty();

  if (messageNotifications.length > 0) {
    notificationsBadge.addClass('badge-alerted');
    notificationsMenu.find('.glyphicon').addClass('alertStatusRed');
    for (let x = 0; x < messageNotifications.length; x++) {
      var cssClass = messageNotifications[x].cssClass,
        dateAsString = messageNotifications[x].dateAsString,
        guid = messageNotifications[x].guid,
        message = messageNotifications[x].message,
        messageImgWidth,
        glyphiconClass;

      if (cssClass.indexOf('info') >= 0) {
        glyphiconClass = 'info';
        messageImgWidth = '20px;';
      } else if (cssClass.indexOf('danger') >= 0) {
        glyphiconClass = 'whatshot';
        messageImgWidth = '18px;';
      } else if (cssClass.indexOf('warn') >= 0) {
        glyphiconClass = 'warning';
        messageImgWidth = '20px;';
      } else {
        glyphiconClass = 'check';
        messageImgWidth = '20px;';
      }

      notificationsMenuList.append(
        '<li class="notification-message ' +
          cssClass +
          '">' +
          '<div class="d-flex justify-content-between">' +
          '<div class="message-column message-icon">' +
          '<img src="'+ CONTEXT_PATH + '/common/images/svg/' +
          glyphiconClass +
          '.svg" width="' +
          messageImgWidth +
          '" alt="' +
          glyphiconClass +
          '">' +
          '</div>' +
          '<div class="message-column">' +
          '<div class="message">' +
          message +
          '</div>' +
          '<div class="message-date">' +
          dateAsString +
          '</div>' +
          '</div>' +
          '<div class="message-column">' +
          '<button class="message-close" onclick="deleteMessageNotification(\'' +
          guid +
          '\', event)">' +
          '<svg aria-hidden="true"><use xlink:href="#crossIcon"></use></svg>' +
          '</button>' +
          '</div>' +
          '</li>'
      );
    }
  } else {
    notificationsMenuList.append(getMenuRow('There are no notifications yet'));
    notificationsBadge.removeClass('badge-alerted');
    notificationsMenu.find('.glyphicon').removeClass('alertStatusRed');
  }
}

function getSubsets(){
    $('#subsetName').html('None');
    $('#subsetsList').html('');

    $.ajax({
        url: $('#viewNameUpdate').val(),
        dataType: 'json',
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        cache: false,
        timeout: ajaxTimeout,
        data: {},
        global: false,
        success: function(json) {
            displaySubsets(json);
        },
    });
}

function displaySubsets(itemsResponse) {
    const viewKey = itemsResponse.viewName;
    const viewNames = itemsResponse.viewNames;
    const subsetList = $('#subsetsList');

    if (viewNames.length > 0) {
        for (let i = 0; i < viewNames.length; i++) {
            let item = viewNames[i];
            subsetList.append(getMenuRow(item.myValue, "setViewName('" + item.myKey + "');"));

            if (item.myKey == viewKey) {
                $('#subsetName').html(item.myValue);
            }
        }
    } else {
        subsetList.append(getMenuRow('There are no subsets yet'));
    }
}

function getMenuRow(message, onClickAction) {
    let selectOption = '<li class="notification-message"';
    if (onClickAction) {
        selectOption += ' onclick="' + onClickAction + '"';
    }
    selectOption += '><div class="d-flex align-items-center justify-content-between">'
        + '<div class="message-column text-center">'
        + '<div class="message">' + message + '</div>'
        + '</div></div></li>';
    return selectOption;
}

function processServerMessages2(json, showOnlyErrors) {
  var output = '';
  var infoIcon = '<svg width="1em" height="1em" viewBox="0 0 16 16" class="bi bi-info-circle info-button" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="cursor:pointer;"><path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"></path><path d="M8.93 6.588l-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588z"></path><circle cx="8" cy="4.5" r="1"></circle></svg>'

  if (typeof showOnlyErrors == 'undefined') {
    showOnlyErrors = false;
  }

  for (i in json.messages) {
    if (json.messages[i].messageType == '0' && !showOnlyErrors) {
      output +=
          '<div class="alert alert-success alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><span class="glyphicon glyphicon-ok-sign" aria-hidden="true"></span>' +
          json.messages[i].message +
          '</div>';
    }
    else if (json.messages[i].messageType == '-1') {
      var messageDetail = json.messages[i].messageDetail;
      var messageDetailHTML = '<div class="message-detail" style="display:none">' + messageDetail + '</div>';
      var additionalInfoHTML = '';

      if (messageDetail) {
        additionalInfoHTML = infoIcon + messageDetailHTML;
      }

      output +=
          '<div class="alert alert-danger alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>' +
          '<span style="margin-right: 5px;">' + json.messages[i].message + '</span>' +
          '<span onClick="toggleInfoText()">' + additionalInfoHTML + '</span>' +
          '</div>';
    }
    else if (json.messages[i].messageType == '1') {
      output +=
          '<div class="alert alert-warning alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>' +
          json.messages[i].message +
          '</div>';
    }
    else if (
      json.messages[i].messageType == '2' ||
      json.messages[i].messageType == '3'
    ) {
      output +=
          '<div class="alert alert-info alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span>' +
          json.messages[i].message +
          '</div>';
    }
    else if (!showOnlyErrors) {
      output +=
          '<div class="alert alert-info alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span>' +
          json.messages[i].message +
          '</div>';
    }
  }

  return output;
}

function processServerMessages(outputId, messageType) {
  var output = '';

  $('#' + outputId).css('margin-bottom', '5px'); // Add some space below the message

  if (messageType == '0')
    output +=
      '<div class="alert alert-success alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
      '<span class="glyphicon glyphicon-ok-sign" aria-hidden="true"></span>Everything is OK. This is a test message.</div>';

  if (messageType == '-1')
    output +=
      '<div class="alert alert-danger alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
      '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>ERRORS DETECTED. This is a test....this is only a test. This is a test message.</div>';

  if (messageType == '1')
    output +=
      '<div class="alert alert-warning alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
      '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>CAUTION. ALERT. This is just a test. This is only a test.....</div>';

  if (messageType == '2' || messageType == '3')
    output +=
      '<div class="alert alert-info alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
      '<span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span>Just an informational message. This is a test.....this is only a test.</div>';

  alert(output);
  $('#' + outputId).html(output);
}

function buttonDownloadActionUrl(objId, url, targetId, clearSessionId) {
  var gridId;
  var guids = [];

  if (typeof targetId == 'undefined' || targetId == null || targetId.length < 1)
    gridId = $('#gridId').val();
  else gridId = targetId;

  if (gridId == null || gridId == '') gridId = 'mainGridList';

	guids = GRID.getSelectedGuids(gridId);
    if (guids != null)
      foundGuid = true;
  
  if (!foundGuid) {
    alert(noRowsSelected);
    return false;
  }

  downloadFileByAjaxPost(objId, url, {gridId: gridId, guids: guids}, "mqscBackup.dat");
  /* REPLACED WITH ABOVE BECAUSE POST CALLS CANNOT BE EASILY USED FOR IFRAMES
  $('<iframe>', { id: 'fileDownload', src: url })
    .hide()
    .appendTo('body');
  */
  return false;
}


function buttonActionUrl(url, targetId, clearSessionId) {
  var gridId;
  var guids = [];

  if (typeof targetId == 'undefined' || targetId == null || targetId.length < 1)
    gridId = $('#gridId').val();
  else gridId = targetId;

  if (gridId == null || gridId == '') gridId = 'mainGridList';

  var guids = GRID.getSelectedGuids(gridId);
  if(!guids) 
	return false;

  if (typeof clearSessionId != 'undefined' && clearSessionId.length > 0) {
    $.ajax({
      url: clearSessionId + '!removeSessionKeys',
      dataType: 'json',
      contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
      global: false,
      cache: false,
      async: false,
      timeout: ajaxTimeout,
      data: { sessionKeys: cookiePrefix + clearSessionId },
      success: function(json) {},
    });
  }

  // Start to show AJAX command is working
  $('#' + gridId + 'Indicator').toggle();

  $.ajax({
    url: url,
    cache: false,
    dataType: 'json',
    contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
    timeout: ajaxTimeout,
    data: {
      guids: guids,
      gridId: gridId,
    },
    success: function(json) {
      // Reload Grid after action is completed
      if (typeof noGridReload == 'undefined' || noGridReload != 'true')
        GRID.refreshGrid(gridId, json);

      // Stop showing AJAX command is working
      $('#' + gridId + 'Indicator').toggle();

      // IMPORTANT: must be called AFTER grid reload cause the grid has a before 'beforeRequest' event that clears messages
    },
    error: function() {
      // Stop showing AJAX command is working
      $('#' + gridId + 'Indicator').toggle();
    },
  });

  return false;
}

function downloadFileByAjaxPost(objId, url, data, fileName) {
	$("#"+objId).addClass("indicatorOverlay");
    $.ajax({
        url: url,
        type: "POST",
        cache: false,
        data: data,
        xhr: function () {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState == 2) {
                	console.log("stastus: " + xhr.status);
                    if (xhr.status == 200) {
                        xhr.responseType = "blob";
                    } else {
                        xhr.responseType = "text";
                    }
                }
            };
            return xhr;
        },
        success: function (data) {
            //Convert the Byte Data to BLOB object.
            var blob = new Blob([data], { type: "application/octetstream" });

            //Check the Browser type and download the File.
            var isIE = false || !!document.documentMode;
            if (isIE) {
                window.navigator.msSaveBlob(blob, fileName);
            } else {
                var url = window.URL || window.webkitURL;
                link = url.createObjectURL(blob);
                var a = $("<a />");
                a.attr("download", fileName);
                a.attr("href", link);
                $("body").append(a);
                a[0].click();
                $("body").remove(a);
            }
        },
        complete: function() {
        	$("#"+objId).removeClass("indicatorOverlay");
        }
    });
}

function clearAllSessionStorage() {
  // Clear the Local Storage of the Internet Browser
  clearSessionStorage('.*');
}

// Removes items passed in from sessionStorage
// itemNamesCsv is expected to be either 1 item or a comma-separated list of items
function clearSessionStorage(itemNamesCsv) {
  var itemNames = itemNamesCsv.split(',');

  try {
    for (var i in sessionStorage) {
      for (var x = 0; x < itemNames.length; x++) {
        var regex = new RegExp('ir360-' + itemNames[x], 'g');
        if (regex.test(sessionStorage.key(i))) {
          sessionStorage.removeItem(sessionStorage.key(i));
          break;
        }
      }
    }
  } catch (e) {
    alert(
      "Could not retrieve item from browser's sessionStorage. KEY:'" +
        key +
        "'. Please close and restart browser. This is a known issue with Internet Explorer."
    );
  }


}

//Removes item passed in from sessionStorage
function removeSessionStorageObject(key) {
  try {
    sessionStorage.removeItem(key);
  } catch (e) {
    alert(
      "Could not retrieve item from browser's sessionStorage. KEY:'" +
        key +
        "'. Please close and restart browser. This is a known issue with Internet Explorer."
    );
  }


}

function listSessionStorage() {
  var out = '';
  try {
    for (var i = 0; i < sessionStorage.length; i++) {
      out += sessionStorage.key(i) + '\n';
    }

    alert(out);
  } catch (e) {
    alert(
      "Could not retrieve item from browser's sessionStorage. KEY:'" +
        key +
        "'. Please close and restart browser. This is a known issue with Internet Explorer."
    );
  }
}

function getSessionStorageObject(key) {
  try {
    var sessionStorageObject = sessionStorage.getItem(key);
    if (sessionStorageObject) {
      return JSON.parse(sessionStorage.getItem(key));
    } else {
      return null;
    }
  } catch (e) {
    alert(
      "Could not retrieve item from browser's sessionStorage. KEY:'" +
        key +
        "'. Please close and restart browser. This is a known issue with Internet Explorer."
    );
    return null;
  }
}

function setSessionStorageObject(key, obj) {
  try {
    sessionStorage.setItem(key, JSON.stringify(obj));
  } catch (e) {
    alert(
      "Could not set item to browser's sessionStorage in setSessionStorageObject(key,obj). KEY:'" +
        key +
        "'. Please close and restart browser. This is a known issue with Internet Explorer."
    );
  }
}

function getSessionStorageObjectValue(key, value) {
  var o = getSessionStorageObject(key);
  if (o) {
    return o[value];
  } else {
    return null;
  }
}

function setSessionStorageObjectValue(key, value, data) {
  var o = getSessionStorageObject(key);
  if (o) {
    o[value] = data;
    setSessionStorageObject(key, o);
  } else {
    var newObject = {};
    newObject[value] = data;
    setSessionStorageObject(key, newObject);
  }
}

function removeSessionStorageObjectValue(key, value) {
  var o = getSessionStorageObject(key);
  if (o && o[value]) {
    delete o[value];
    setSessionStorageObject(key, o);
  }
}

function getLocalStorageObject(key) {
  try {
    var o = localStorage.getItem(key);
    if (o) return JSON.parse(o);
    else return null;
  } catch (e) {
    alert(
      "Could not retrieve item from browser's localStorage. KEY:'" +
        key +
        "'. Please close and restart browser. This is a known issue with Internet Explorer."
    );
    return null;
  }
}

function setLocalStorageObject(key, obj) {
  try {
    localStorage.setItem(key, JSON.stringify(obj));
  } catch (e) {
    alert(
      "Could not retrieve item from browser's localStorage. KEY:'" +
        key +
        "'. Please close and restart browser. This is a known issue with Internet Explorer."
    );
    return null;
  }
}

function removeLocalStorageObject(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    alert(
      "Could not remove item from browser's localStorage. KEY:'" +
        key +
        "'. Please close and restart browser. This is a known issue with Internet Explorer."
    );
    return null;
  }
}

function clearAllLocalStorage() {
  // Clear the Local Storage of the Internet Browser
  clearLocalStorage('.*');
}

// Removes items passed in from sessionStorage
// itemNamesCsv is expected to be either 1 item or a comma-separated list of items
function clearLocalStorage(itemNamesCsv) {
  var itemNames = itemNamesCsv.split(',');

  try {
    for (var i in localStorage) {
      for (var x = 0; x < itemNames.length; x++) {
        var regex = new RegExp('ir360-' + itemNames[x], 'g');
        if (regex.test(localStorage.key(i))) {
          localStorage.removeItem(localStorage.key(i));
          break;
        }
      }
    }
  } catch (e) {
    alert(
      "Could not retrieve/clear browser's localStorage. Please close and restart browser. This is a known issue with Internet Explorer."
    );
    return null;
  }


}

function listLocalStorage() {
  var out = '';

  try {
    for (var i = 0; i < localStorage.length; i++) {
      out += localStorage.key(i) + '\n';
    }
  } catch (e) {
    alert(
      "Could not retrieve browser's localStorage. Please close and restart browser. This is a known issue with Internet Explorer."
    );
    return null;
  }

  alert(out);
}

// Pass in an element that has a value attribute that can be used as a filter
// The value attribute will contain the specific div id to display
// The div id contains a prefix (everything up to "_") and a unique end part that distinguishes it
// from the other divs with that prefix
// All divs with the prefix specified will be hidden except for the one with the specific end part
function displayOrHideDivs(elem) {
  var divToDisplay = $(elem).val();
  var divIdPrefix = divToDisplay.substring(0, divToDisplay.indexOf('_'));

  if (divIdPrefix.length > 0) {
    $('div[id^=' + divIdPrefix + ']').each(function() {
      if ($(this).attr('id') === divToDisplay) {
        $(this).css('display', 'inline-block');
        $(this).css('width', '100%');
      } else {
        $(this).css('display', 'none');
      }
    });
  }
}

// Make the avadaLayoutMenu the same height as the avadaLayoutBody
function makeMenuHeightEqualBodyHeight() {
  $('#avadaLayoutMenu > div.panel').height($('#avadaLayoutBody').height() - 20);
}

function setupConsoleMenu(consoleMenu) {
  // Toggle hovering
  $(consoleMenu)
    .prev()
    .hover(
      function() {
        $(consoleMenu).css('display', 'inline-block');
      },
      function() {
        $(consoleMenu).css('display', 'none');
      }
    );
  $(consoleMenu).hover(
    function() {
      $(consoleMenu).css('display', 'inline-block');
    },
    function() {
      $(consoleMenu).css('display', 'none');
    }
  );

  // Toggle keydown (Enter opens/closes the menu & Esc inside the menu closes)
  var ENTER_KEY = 13;
  var ESC_KEY = 27;
  $(consoleMenu)
    .prev()
    .keydown(function(event) {
      if ($(consoleMenu).css('display') === 'none') {
        // Only Enter should open the menu
        if (event.which === ENTER_KEY) {
          $(consoleMenu).css('display', 'inline-block');
        }
      } else {
        // Menu is opened...
        // Enter and Esc should close the menu
        if (event.which === ENTER_KEY || event.which === ESC_KEY) {
          $(consoleMenu).css('display', 'none');
        }
      }
    });
  $(consoleMenu).keydown(function(event) {
    // Only Esc should close the menu
    if (event.which === ESC_KEY) {
      $(consoleMenu).css('display', 'none');
      $(consoleMenu)
        .prev()
        .dropdown('toggle');
    }
  });

  // Top level <li> elems need to be inline-block to float correctly on screen
  $(consoleMenu)
    .children('ul')
    .children('li')
    .each(function() {
      if ($(this).css('display') !== 'none') {
        $(this).css('display', 'inline-block');
      }
    });

  // Remove any consoles that don't have options underneath them
  var consoles = [];
  $(consoleMenu)
    .children('ul')
    .children('li')
    .each(function(consoleIndex, consoleElem) {
      if ($(consoleElem).css('display') === 'none') {
        $(consoleElem).remove();
      } else {
        var optionsArePresent = false;
        $(consoleElem)
          .children('ul')
          .children('li')
          .each(function(menuLinkIndex, menuLinkElem) {
            if ($(menuLinkElem).css('display') !== 'none') {
              optionsArePresent = true;
              return false;
            }
          });
        if (optionsArePresent) {
          consoles.push($(consoleElem));
        } else {
          $(consoleElem).remove();
        }
      }
    });

  // If consoles were removed (the number of consoles will be less than 9), rebuild the 3 column console menu
  if (consoles.length < 9) {
    // First, remove all of the current li's
    $(consoleMenu)
      .children('ul')
      .children('li')
      .remove();

    // Next, repopulate the menu with the saved consoles
    for (var x = 0; x < consoles.length; x++) {
      var row = Math.floor(x / 3) + 1;
      $(consoleMenu)
        .children('ul:nth-of-type(' + row + ')')
        .append($(consoles[x]));
    }
  }

  // Set console menu width based on which menus are visible
  $(consoleMenu).width(setConsoleMenuWidth());

  function setConsoleMenuWidth() {
    var origWidth = $(consoleMenu).width();

    // Calculate widths
    var consoleWidths = [0, 0, 0];
    $(consoleMenu)
      .children('ul')
      .each(function(index) {
        $(this)
          .children('li')
          .each(function() {
            if ($(this).css('display') !== 'none') {
              consoleWidths[index] += $(this).width();
            }
          });
      });

    // Determine the largest width
    var largestWidth = consoleWidths[0];
    if (consoleWidths[1] > largestWidth) {
      largestWidth = consoleWidths[1];
    }
    if (consoleWidths[2] > largestWidth) {
      largestWidth = consoleWidths[2];
    }

    // Return reduced width if there's a significant gap to the right side of the menu
    // Otherwise return original width
    if (origWidth - largestWidth > 50) {
      return largestWidth + 20;
    } else {
      return origWidth;
    }
  }
}

// Add a delete modal to the current page's body
function setupDeleteModal(title, body, targetId) {
  $.get($('#deleteTemplateUrlHidden').val(), function(template) {
    var view = {
      title: title,
      body: body,
      targetId: targetId,
    };

    Mustache.parse(template); // optional, speeds up future uses
    var output = Mustache.render(template, view);
    $('body').append(output);
  });
}

// Retrieves the guid param value ("?guid=...") from the current url in the address bar if one is present
// If it can't be found, an empty string is returned
function getGuidParamValueFromCurrentUrl() {
  var search = location.search;
  if (search.indexOf('guid=') === -1) {
    return '';
  }
  var guidStartIndex = search.indexOf('guid=') + 5;
  var nextParamIndex = search.indexOf('&', guidStartIndex);
  if (nextParamIndex !== -1) {
    return search.substring(guidStartIndex, nextParamIndex);
  } else {
    return search.substring(guidStartIndex);
  }
}

/*
    resizeselect
    Run this in one of two ways:

    HTML - Add the class .resizeselect to any select element:
    <select class="btn btn-select resizeselect">
        <option>All</option>
        <option>Longer</option>
        <option>A very very long string...</option>
    </select>

    JavaScript - Call .resizeselect() on any jQuery object:
    $("select").resizeselect()
 */
(function($, window) {
  var arrowWidth = 30;

  $.fn.resizeselect = function() {
    return this.each(function() {
      $(this)
        .change(function() {
          var $this = $(this);
          var maxWidth = 0;

          var $test = $('<span>');
          $test.appendTo('body');

          // loop through all options and put text in test element for width
          // set max width to largest option
          $this.children().each(function() {
            var $option = $(this);

            var text = $option.text();
            $test.html(text);
            var width = $test.width();

            if (width > maxWidth) {
              maxWidth = width;
            }
          });

          $test.remove();

          // set select width
          $this.width(maxWidth + arrowWidth);

          // run on start
        })
        .change();
    });
  };

  // run by default
  $('select.resizeselect').resizeselect();
})(jQuery, window);

function trackUrlHistory() {
  var currentHref = window.location.href;
  var urlTrackerAsJsonString = getAvadaUrlTrackerString();
  if (urlTrackerAsJsonString < 1) {
    urlTrackerArray = new Array(currentHref);
    setSessionStorageObject(
      'avada-url-tracker-array',
      JSON.stringify(urlTrackerArray)
    );
    return;
  }

  var urlTrackerArray = JSON.parse(urlTrackerAsJsonString);

  if (currentHref == urlTrackerArray[0]) {
    //ignore a page refresh
    return;
  }

  urlTrackerArray.unshift(currentHref); //adds to top of array
  if (urlTrackerArray.length > 10) {
    urlTrackerArray.pop(); //removes last element in array
  }
  setSessionStorageObject(
    'avada-url-tracker-array',
    JSON.stringify(urlTrackerArray)
  );
}

function retrieveUrlHistory(searchString) {
  var urlTrackerAsJsonString = getAvadaUrlTrackerString();
  if (!urlTrackerAsJsonString) {
    return null;
  }
  var urlTrackerArray = JSON.parse(urlTrackerAsJsonString);
  var urlTrackerRegexp = RegExp('\\b' + searchString + '\\b');

  for (i = 0; i < urlTrackerArray.length; i++) {
    if (urlTrackerRegexp.test(urlTrackerArray[i])) {
      return urlTrackerArray[i];
    }
  }

  return null;
}

function getAvadaUrlTrackerString() {
    return getSessionStorageObject('avada-url-tracker-array');
}

function getAvadaUrlTrackerArray() {
    const avadaUrlTrackerString = getAvadaUrlTrackerString();
    return avadaUrlTrackerString ? JSON.parse(avadaUrlTrackerString) : [];
}

function isInteger(value) {
    if (value.indexOf('.') !== -1) {
        return false;
    }
    let num = Number(value);
    if (isNaN(num)) {
        return false;
    }
    if ( ! isFinite(num)) {
        return false;
    }
    if (Math.floor(num) !== num) {
        return false;
    }
    return true;
}

//character counter for jQuery
//https://github.com/mmmmlemon/jQuery_charCounter
//https://www.jqueryscript.net/form/character-counter-spaces.html
$.fn.charCounter = function(options) {

    var settings = $.extend({
        customClass: '',
        divider: 'slash',
        fontSize: '1rem'
    }, options);

    var divider = " / ";

    if (settings.divider === "dash") {
        divider = " - ";
    } else if (settings.divider === "bar") {
        divider = " | ";
    }

    var input = this;

    var maxlength = $(input).attr("maxlength");

    if (maxlength === undefined || maxlength === "") {
        console.error('jQuery Character Counter. The "maxlength" attribute of "#${input.attr(\'id\')}" should be set.');
    } else {
        $('<div><span class="charCounter '+ settings.customClass +'" style="font-size:' + settings.fontSize +'">0' + divider + maxlength + '</span><span class="charCounterMessage error" style="padding-left: 15px; color: red; font-style: italic"></span>').insertAfter(input);

        var charCounter = $(input).next().find(".charCounter");
        var charCounterMessage = $(input).next().find(".charCounterMessage");
        function count_chars() {
            var txt = $(input).val();
            var txtLength = txt.length;
            if(txtLength > maxlength) {
            	var txt = txt.substring(0, maxlength);
            	$(input).val(txt);
            	var message = "Content exceeded maximum characters allowed of " + maxlength + ". It has been truncated from " + txtLength + ".";
            	$(charCounterMessage).text(message);
            }else{
            	$(charCounterMessage).text(" ");
            }
            $(charCounter).text(txt.length + divider + maxlength);
        }

        count_chars();

        $(input).keyup(function() {
            count_chars();
        });

        $(input).keydown(function() {
            count_chars();
        });

        $(input).change(function() {
            count_chars();
        });

        return this;
    }

};

const selectConfig = {
  theme: 'bootstrap4'
};

function transformSelectToTheSelect2(selector){
  $(selector).each(function () {
    const select = $(this);
    select.sortSelect();
    select.select2(selectConfig);
  });
}
