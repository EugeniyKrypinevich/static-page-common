/**
 * Generic function to determine if one string begins with supplied input
 * Usage: var doesItStartWith = "good kitty".startsWith("good"); // returns true.
 */
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function(str) {
    return this.indexOf(str) == 0;
  };
}

/**
 * Generic function to determine if a string begins with any of the strings in the input array
 * Usage: var doesItStartWithOneOf = "good kitty".startsWithOneOf(["bad", "good"]); // returns true.
 */
if (typeof String.prototype.startsWithOneOf != 'function') {
  String.prototype.startsWithOneOf = function(arr) {
    if (this && arr) {
      for (i = 0; i < arr.length; i++) {
        if (this.startsWith(arr[i])) return true;
      }
    }
    return false;
  };
}

if (typeof String.prototype.endsWith != 'function') {
  String.prototype.endsWith = function(str) {
    return this.substring(this.length - str.length, this.length) === str;
  };
}

function removeWhitespace(str) {
  return str.replace(/\s/g, '');
}

String.prototype.removeStrAt = function(idx, length) {
  var preString = this.slice(0, idx);
  var postString = this.slice(idx + length);
  return preString + postString;
};

String.prototype.removeCharAt = function(idx) {
  var preString = this.slice(0, idx);
  var postString = this.slice(idx + 1);
  return preString + postString;
};

String.prototype.splice = function(idx, s) {
  preString = this.slice(0, idx);
  postString = this.slice(idx);
  return preString + s + postString;
};

function eliminateDuplicatesFromArray(arr) {
  var i,
    len = arr.length,
    out = [],
    obj = {};

  for (i = 0; i < len; i++) {
    obj[arr[i]] = 0;
  }
  for (i in obj) {
    out.push(i);
  }
  return out;
}

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if (new Date().getTime() - start > milliseconds) {
      break;
    }
  }
}

$(function() {
  (function($) {
    $.fn.extend({
      textAreaLimiter: function() {
        var maxLimit = $(this).attr('maxlength');
        var id = $(this).attr('id');
        $(this).after(
          "<div class='text-area-limiter'><span id='textAreaLimiterCounter_" +
            id +
            "'>0</span> characters remaining.</div>"
        );
        var counter = $('#textAreaLimiterCounter_' + id);

        $(this).on('keydown keyup focus keypress', function(e) {
          setCount(this, counter, e);
        });

        function setCount(src, counter, e) {
          if (!src) return;
          var chars = src.value.length;
          if (chars == maxLimit) {
            counter.html(maxLimit - chars);
            counter.addClass('textAreaLimiterMaxLimit');
            return false;
          } else if (chars > maxLimit) {
            src.value = src.value.substr(0, maxLimit);
            chars = maxLimit;
            counter.addClass('textAreaLimiterMaxLimit');
          } else {
            counter.removeClass('textAreaLimiterMaxLimit');
          }
          counter.html(maxLimit - chars);
        }
        setCount($(this)[0], counter);
      },
    });
  })(jQuery);
});
