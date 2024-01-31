/**
 * GLOBAL
 */
function Global(){}
Global.isie = navigator.userAgent.match(/msie/i);

Global.offAttr = (Global.isie)?"readOnly":"disabled";
Global.loggingEnabled = false;
	
var focusBlur = function($e){
	$($e.srcElement).blur();
};

var killClick = function($e){
	return false;
};

function isElementQualified($el,toOmit){
	if ($el && $el.attr("id") != null 
			&& $el.attr("id") != undefined 
			&& !$el.attr("id").startsWithOneOf(toOmit) 
			&& (typeof MultiFieldShuttle != "undefined" && !MultiFieldShuttle.contains($el.attr("id")))){
		return true;
	}
	return false;
}

/**
 * Generic function to enable/disable single form element.
 * usage: $("#someFormElementId").enableDisableElement(true);
 */
$.fn.enableDisableElement = function(enable){
	this.each(function(index, el) {
	    var $el = $(el);
	    var tag = ($el.get(0)!=null)?$el.get(0).nodeName.toLowerCase():"";
	    var type = ($el.attr("type")) ? $el.attr("type").toLowerCase():"";
	    
	    var isMultiple = (tag == "select" && ($el.attr("multiple")=="multiple" || $el.attr("multiple")==true))
	    var isButton = (type == "button" || type == "submit")
	    var isCheckbox = (type == "checkbox");
	    var isRadio = (type == "radio");
	    var isSpinner = (type == "text" && $el.hasClass("avada-spinner"));
	    var isDatePicker = (type == "text" && $el.hasClass("hasDatepicker"));
	    
	    tmpOffAttr = (isButton || isCheckbox || isRadio)?"disabled":Global.offAttr; //special case for IE, buttons always disabled not readonly.
		if (enable) {
			if(isSpinner){
				$el.spinner("enable");
			}else if(isDatePicker){
				$el.datepicker("enable");
			}
			
			// (rsordillo) changed
			$el.removeAttr(tmpOffAttr);
			$el.removeAttr(tmpOffAttr.toLowerCase()); 
			if (Global.isie && !isButton) {
				if (type == "radio" || type == "checbox") {
					$el.unbind('click', killClick);
				} else if (isMultiple){
					$("option",$el).unbind('focus', focusBlur);
				} else {
					$el.unbind('focus', focusBlur);
				}
			}
		} else {
			if(isSpinner){
				$el.spinner("disable");
				if(Global.isie){
					$el.removeAttr("disabled"); // override what spinner and datepicker do on disable.
				}
			}else if(isDatePicker){
				$el.datepicker("disable");
				if(Global.isie){
					$el.removeAttr("disabled"); // override what spinner and datepicker do on disable.
				}
			}
			
			$el.attr(tmpOffAttr, tmpOffAttr);
			if (Global.isie && !isButton) {
				if (type == "radio" || type == "checbox") {
					$el.bind('click', killClick);
				} else if (isMultiple){
					$("option",$el).bind('focus', focusBlur);
				} else {
					$el.bind('focus', focusBlur);
				}
			}
		}
	});
};


/**
 * Generic function to add or remove the disabled style as 
 * appropriate for browser and control type for single form element.
 * usage: $("#someFormElementId").enableDisableStyle(true);
 */
$.fn.enableDisableStyle = function(enable){
    var $el = $(this);
    var type = ($el.attr("type")) ? $el.attr("type").toLowerCase():"";
    var isButton = (type == "button" || type == "submit")
    var isCheckbox = (type == "checkbox");
    var isRadio = (type == "radio");
    tmpOffAttr = (isButton || isCheckbox || isRadio)?"disabled":Global.offAttr.toLowerCase();
	if (enable) {
		$el.removeClass(tmpOffAttr);
	} else {
		$el.addClass(tmpOffAttr);
	}
};

/**
 * Generic function to enable/disable all form elements except the ones supplied as in omit array.
 * usage: $("#someFormId").enableDisableForm(["save_btn","cancel_btn","new_btn"], true);
 */
$.fn.enableDisableForm = function(toOmit, enable){
	if (typeof MultiFieldShuttle != "undefined")
		MultiFieldShuttle.toggleShuttles(enable);
	
	$("input[type!='hidden'],select,textarea",$(this)).each( function(i, el){
		var $el = $(el)
		var isQual = isElementQualified($el,toOmit);
		if (isQual || $el.attr("id") == null) {
			$el.enableDisableElement(enable);
		}
	 });
};


/**
 * Generic function to sort a select elements child options by 
 * label ascending. 
 * usage: $("#someSelectId").sortSelect();
 */
$.fn.sortSelect = function() {
	this.each(function(index, selectElement) {
		if (selectElement && selectElement.tagName.toUpperCase() === "SELECT") {

            // This code that primarily sets "val" is for dealing with IE11's strange behavior of having discrepancies
            // between screen selected option and what the DOM says is the selected option when
            // history.go(-n) is done.  Chrome and Edge seem to perform fine.
            //
            // StackOverflow issue was opened for this with details: https://stackoverflow.com/q/47161540/1098361
            //
            // Comment written by zmacomber 2017-11-07
            var key = "ir360-" + location.href + "-" + $(selectElement).prop('id');
            var sessionStorageSelectVal = getSessionStorageObject(key);
            var val;
            if ((getSessionStorageObject('ir360-history-go-back') !== null) && (sessionStorageSelectVal !== null)) {
                val = sessionStorageSelectVal;
            } else {
                val = $(selectElement).val();
            }

            var options = $(selectElement).children('option');

            options.sort(function(a, b) {
                if ( ! a.text) {
                    a.text = "";
                }
                if ( ! b.text) {
                    b.text = "";
                }
                if (a.text.toLowerCase() > b.text.toLowerCase()) {
                    return 1;
                } else if (a.text.toLowerCase() < b.text.toLowerCase()) {
                    return -1;
                } else {
                    return 0;
                }
            });

            $(selectElement).empty();
            $(selectElement).append(options);
            $(selectElement).val(val);

            setSessionStorageObject(key, val);
		}
	});
};

/**
 * Generic function to reconcile option lists in an option transfer select.
 * Scenario, we want to remove options from "this" where we have matches in the
 * argument select. usage:
 * $("#someSelectId").reconcileSelect("theOtherSelectId");
 */
$.fn.reconcileSelect = function(select2Id){
	var select2Options = $("#" + select2Id + " > option");
	var select1 = this;
	var optionSelector="";
	$(select2Options).each( function(idx, el){
		var optionVal=$(el).attr("value");
		
		optionSelector = " > option[value='" + optionVal + "']";
		$(optionSelector,select1).remove();
	});
};

/**
 * Simple logger utility, we can expand to different loging levels and targets down the road.
 * 
 * @usage $.log("your message goes here, variable value: ", + val);
 * @param message
 * @returns boolean
 * TODO: add targets, for instance instead of logging to console log to a div tag in the footer.jsp
 * TODO: add different logging levels, INFO, DEBUG, WARNING etc.. 
 */
jQuery.log = function(message) {
	if (!Global.loggingEnabled) return false;

	if (typeof window.console != 'undefined'
			&& typeof window.console.log != 'undefined') {
		console.log(message);
	} else {
		alert(message);
	}
	return true;
};

/**
 * Utility method for retrieving a jQuery element by passing in the id of the
 * element you want. Simply a shortcut.
 * 
 * @usage $.getById("some_element_id");
 * @param id
 * @returns element
 */
jQuery.getById = function(id){
	return $("#" + id);	
};


/**
 * Utility method for retrieving a jQuery radio elements
 * by passing in the name attribute of the element you want.
 * Simply a shortcut.
 * 
 * @usage $.getRadioByName("some_element_name");
 * @param id
 * @returns element
 */
jQuery.getRadioByName = function(name){
	return $("input:radio[name=" + name + "]");	
};

/**
 * Utility method for retrieving a jQuery element by passing in the name attribute of the element you want.
 * Simply a shortcut.
 * 
 * @usage $.getByName("some_element_name");
 * @param id
 * @returns element
 */
jQuery.getByName = function(name){
	return $("[name=" + name + "]");	
};

/**
 * Check for custom avada-required attribute
 * 
 * @usage $.isAvadaRequired(obj);
 * @param obj, can be selector or jquery object
 * @returns boolean
 */
jQuery.isAvadaRequired  = function( obj ) {
	return $(obj).attr("avada-required")=="false" ? false : true;
};

/**
 * Remove object from array
 * 
 * @usage $.removeFromArray(value, array);
 * @param value to remove, array to modify
 * @returns modifiedArray
 */
jQuery.removeFromArray = function(value, array) {
    return jQuery.grep(array, function(elem, index) {
        return elem !== value;
    });
};

/**
 * Deselect all options for a an element.  Written with <select> elements in mind.
 * 
 * @usage $("input[type=select]").deselect();
 * @returns jQuery
 */
jQuery.fn.deselect = function() {
	  return this.each(function(){
		  $("option:selected", this).prop("selected", false);
	  });
};

/**
 * Select all options for a an element.  Written with <select> elements in mind.
 * 
 * @usage $("input[type=select]").select();
 * @returns jQuery
 */
jQuery.fn.select = function() {
	  return this.each(function(){
		  $("option", this).prop("selected", true);
	  });
};

/**
 * Add option to select element.  
 * If text is null use val for both label and value
 * 
 * @usage $("input[type=select]").addOption(val,text);
 * @returns jQuery
 */
jQuery.fn.addOption = function(val,text) {
	  return this.each(function(){
		  $(this).append($('<option></option>').val(val).html((text)?text:val) );
	  });
};


/**
 * Populate select box from a array of key value pairs  
 * 
 * @usage $("#someSelect").populateSelect(options);
 * @returns jQuery
 */
jQuery.fn.populateSelect = function(options) {
	  options = (options) ? options: {};
	  return this.each(function(){
		  var $select = $(this);
		  $select.empty();
		  $.each(options, function(key, val) { 
		     $select.append($('<option></option>').val(key).html(val));
		  });
	  });
};

/**
 * Set value of multi-select based on input array and append new
 * options where nec...  
 * 
 * @usage $("#someSelect").setMultiSelectVal(valArr,labelArr);
 * @returns jQuery
 */
jQuery.fn.setMultiSelectVal = function(valArr, labelArr) {
	  labelArr=(labelArr)?labelArr:[];
	  return this.each(function(){
		  var $select = $(this);
		  $select.val(valArr);
		  if (!$select.val()){
			  $.each(valArr, function(index, val) { 
				  $select.append($('<option></option>').val(val).html((labelArr[index])?labelArr[index]:val));
				});
		  }
		  $(valArr).each(function (idx, val){
			  $(" option[value='" + val + "']",$select).prop("selected",true);
		  });

	  });
};



/**
 * Disables and hides form fields and wrapper element if present.
 * 
 * @usage $("input").disableHide();
 * @returns jQuery
 */
jQuery.fn.disableHide = function() {
	 return this.each(function(idx,field){
		   $field = $(field);
		   $("*", $field).enableDisableElement(false);
		   $("*", $field).enableDisableStyle(false);
		   $field.hide();
	  });
	  
};

/**
 * Enables and shows form field and wrapper element if present.
 * 
 * @usage $("input").enableShow();
 * @returns jQuery
 */
jQuery.fn.enableShow = function() {
	  return this.each(function(idx,field){
		  $field = $(field);
		  
		  // (rsordillo) changed
		  $("*", $field).enableDisableElement(true);
		  $("*", $field).enableDisableStyle(true);
		  $field.show();
	  });
};

/**
 * Disables form field.
 * 
 * @usage $("input").disable();
 * @returns jQuery
 */
jQuery.fn.disable = function() {
	  return this.each(function(idx,field){
		  $(field).attr("disabled", "disabled");
	  });
};

/**
 * Enables form field.
 * 
 * @usage $("input").enable();
 * @returns jQuery
 */
jQuery.fn.enable = function() {
	  return this.each(function(idx,field){
		  $(field).removeAttr("disabled");
	  });
};

/**
 * Take an array of for element ids or radio button group name
 * and return a array of jQuery elements
 * 
 * @usage $(["id1","id2","id3"]).idsToElements();
 * @returns array
 */
jQuery.fn.idsToElements = function() {
	var $fields = [];
	this.each(function(n, val) {
		var fieldIdArr = val.split("|");
		var fieldId = fieldIdArr[0];
		var avadaRequired = fieldIdArr[1];
		var field = $.getById(fieldId);
		var type = (field.length != 0) ? field[0].type : null;

		// The only type of form elements we will attempt to get by name is radio controls.
		// Due to the HTML DOM spec you have to retrive input type radio array by name attribute.
		// Selecting by ID will always yeild a single DOM element which is useless.
		var isRadio = (!type || type == "radio");
		if (isRadio) {
			var radio = $.getRadioByName(fieldId);
			field = radio;
		} 
		$(field).attr("avada-required",avadaRequired);
	    $fields[n] = field;
	});
	return $fields;
};

/**
 * Enable/disable control utility method
 * 
 * @usage $("#some_button_id").toggleEnable(false);
 * @returns jQuery
 */
jQuery.fn.toggleEnable = function(enable) {
	return this.each(function(index, element) {
		if (enable) {
			$(element).removeAttr("disabled");
		} else {
			$(element).attr("disabled", "disabled");
		}
	});
};

/**
 * Add move option up/down support
 * 
 * @usage $("#someSelectId").selectAddUpDown("upFieldId","downFieldId");
 * @returns jQuery
 */
jQuery.fn.selectAddUpDown = function(upFieldId,downFieldId) {
	var upElm = $.getById(upFieldId);
	var downElm = $.getById(downFieldId);
	
	$(upElm).click(function(){

		$('option:selected').each(function(){
			   $(this).insertBefore($(this).prev());
			  });
	 });

	 $(downElm).click(function(){

		 $('option:selected').each(function(){
			   $(this).insertAfter($(this).next());
			  });
	  });
};

