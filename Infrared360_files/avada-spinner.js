
	$(function() {
		(function ($) {
		    $.fn.extend({
		        avadaSpinner: function (minVal, maxVal, isDisabled) {
		        	var id = $(this).attr("id");
		        	$(this).after(createSpinnerHtml(id));
		        	initializeSpinner(id, minVal, maxVal, isDisabled);
					//$()
		        }
		    });
		})(jQuery);
	});

	function createSpinnerHtml(id, cssClass, size) {
		var html = '<input type="text" class="'+cssClass+'" id="'+id+'" name="'+id+'" size="'+size+'"/>';
	}
	
	//make sure infrared360-util.js comes before this because of isInteger function
	function initializeSpinner(cssSelector, step, defaultVal, minVal, maxVal, disabledFlag) {
		var isDisabled = disabledFlag;

		if(!isDisabled)
			isDisabled = false;
		$(cssSelector).spinner({
			min: minVal,
			max: maxVal,
			step: step,
			disabled: isDisabled,
			change: function(event, ui)
			{
				if ( ! isInteger(this.value))
				{
					alert("Please specify Integer value between " + $(this).spinner("option", "min") + " and " + $(this).spinner("option", "max"));
					$(this).spinner("value", $(this).spinner("option", "min"));
				}
				else
				{
					if (this.value < $(this).spinner("option", "min"))
						$(this).spinner("value", $(this).spinner("option", "min"));
					else
					if (this.value > $(this).spinner("option", "max"))
						$(this).spinner("value", $(this).spinner("option", "max"));
				}
			}	
		}).val(defaultVal);
	}