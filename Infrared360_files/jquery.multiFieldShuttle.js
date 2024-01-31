// Object.create Polyfill for non-ECMAScript5 browsers
if (typeof Object.create != 'function') {
  Object.create = (function(undefined) {
    var Temp = function() {};
    return function(prototype, propertiesObject) {
      if (prototype !== Object(prototype) && prototype !== null) {
        throw TypeError('Argument must be an object, or null');
      }
      Temp.prototype = prototype || {};
      var result = new Temp();
      Temp.prototype = null;
      if (propertiesObject !== undefined) {
        Object.defineProperties(result, propertiesObject);
      }

      // to imitate the case of Object.create(null)
      if (prototype === null) {
        result.__proto__ = null;
      }
      return result;
    };
  })();
}

function MultiFieldShuttle() {}

MultiFieldShuttle.arrayPattern = /\[.*?\]/g;
MultiFieldShuttle.regexResChar = '[^$.|?*+()]';
MultiFieldShuttle.conditionBuilderCntr = 0;
MultiFieldShuttle.shuttles = [];
MultiFieldShuttle.allFields = []; //global bucket of all fields used in shuttles/condition builders

// fields can be a single string or array of strings.
MultiFieldShuttle.contains = function(fields) {
  if ($.isArray(fields)) {
    for (i = 0; i < fields.length; i++) {
      if ($.inArray(fields[i], MultiFieldShuttle.allFields) != -1) {
        return true;
      }
    }
  } else if ($.inArray(fields, MultiFieldShuttle.allFields) != -1) {
    return true;
  }
  return false;
};

MultiFieldShuttle.push = function(
  $shuttle,
  fields,
  select,
  addButton,
  removeButton
) {
  var shuttles = MultiFieldShuttle.shuttles;
  shuttles.push($shuttle);

  var allFields = MultiFieldShuttle.allFields;
  for (i = 0; i < fields.length; i++) {
    allFields.push(fields[i]);
  }
  allFields.push(select);
  allFields.push(addButton);
  allFields.push(removeButton);
};

MultiFieldShuttle.toggleShuttles = function(enabled) {
  shuttles = MultiFieldShuttle.shuttles;
  for (i = 0; i < shuttles.length; i++) {
    if (enabled) {
      shuttles[i].enable();
    } else {
      shuttles[i].disable();
    }
  }
};

var Shuttle = function(settings) {
  var shtl = this;

  shtl.config = {
    fields: [],
    value_field: null,
    add: 'add_btn',
    remove: 'remove_btn',
    delimiter: '^',
    label_delimiter: '-',
    sub_delimiter: '|',
    label_sub_delimiter: '|',
  };
  if (settings) {
    $.extend(shtl.config, settings);
  }
  shtl.isEnabled = true;
};

Shuttle.prototype.enable = function() {
  var shtl = this;
  shtl.isEnabled = true;
  $.each(shtl.$fields, function(i, $field) {
    $field.enableDisableElement(true);
  });
  shtl.$select.enableDisableElement(true);
  shtl.$addButton.enableDisableElement(true);
  shtl.$removeButton.enableDisableElement(true);
};

Shuttle.prototype.disable = function() {
  var shtl = this;
  shtl.isEnabled = false;
  $.each(shtl.$fields, function(i, $field) {
    $field.enableDisableElement(false);
  });
  shtl.$select.enableDisableElement(false);
  shtl.$addButton.enableDisableElement(false);
  shtl.$removeButton.enableDisableElement(false);
};

Shuttle.prototype.initControls = function() {
  var shtl = this;
  var cfg = shtl.config;
  shtl.$fields = $(cfg.fields).idsToElements();
  shtl.$select = $.getById(cfg.value_field);
  shtl.$addButton = $.getById(cfg.add);
  shtl.$removeButton = $.getById(cfg.remove);
};

/** Initialize the component */
Shuttle.prototype.initShuttle = function() {
  var shtl = this;
  var cfg = shtl.config;
  shtl.initControls();

  // disable remove until option clicked
  shtl.$removeButton.toggleEnable(false);

  shtl.$addButton.click(function(e) {
    if (!shtl.isEnabled) return;

    if (!shtl.validate()) return false;
    if(cfg.maxEntries && $("#"+cfg.value_field + " option").length >= cfg.maxEntries) {
		if(!cfg.maxEntryMessageValue1) {
			cfg.maxEntryMessageValue1 = "entries";
		}
		alert("Only " + cfg.maxEntries + " " + cfg.maxEntryMessageValue1 + " allowed.");
		return;
	}	
    shtl.addEntry();
    shtl.$removeButton.toggleEnable(false);
    shtl.$select.deselect();
    $.publish($(this).attr('id') + '_success');
  });

  shtl.$removeButton.click(function() {
    $(':selected', shtl.$select).remove();
    $(this).toggleEnable(false);
  });

  shtl.$select.click(function() {
    if (!shtl.isEnabled) return;

    var selected = $(':selected', this);
    if (selected.length == 0) {
      shtl.$removeButton.toggleEnable(false);
    } else {
      shtl.setSelected($(selected).last());
      shtl.$removeButton.toggleEnable(true);
    }
  });
};

/**
 * When user clicks on a item in filter re-populate fields by parsing
 * selected value
 */
Shuttle.prototype.setSelected = function(option) {
  var shtl = this;
  var cfg = shtl.config;
  var before_set = cfg.value_field + '_before_set_selected';
  $.publish(before_set);
  var fieldValue = option.val();
  fieldValue = shtl.getSelectedVal(fieldValue);
  var fieldArray = fieldValue.split(cfg.delimiter);
  $.each(shtl.$fields, function(i, e) {
    var type = e.attr('type');
    if (!type) {
      var tag = e.get(0).tagName.toLowerCase();
      if (tag == 'select' && e.attr('multiple') == 'multiple') {
        type = 'select-multiple';
      }
    }
    var val = fieldArray[i];
    if (type == 'select-multiple') {
      var valArr = val.substr(1, val.length - 2).split(cfg.sub_delimiter);
      $(e).val(valArr);
    } else if (type == 'radio') {
      e.attr('checked', false);
      var name = e.attr('name');
      $("[name='" + name + "'][value='" + val + "']").attr('checked', true);
    } else if (type == 'checkbox') {
      if (val && val != '') {
        e.attr('checked', true);
      } else {
        e.attr('checked', false);
      }
    } else {
      e.val(val);
    }
    e.change();
  });
};

/**
 * See if we've got a nested array [va1^val2...].  If we do we need to swap out the
 * delimiter for parsing purposes so we can set the selections properly.
 * Otherwise boku difficulty parsing nested arrays with a single delimiter.
 */
Shuttle.prototype.getSelectedVal = function(optVal) {
  var shtl = this;
  var cfg = shtl.config;

  var mtch = optVal.match(MultiFieldShuttle.arrayPattern);
  var escDel =
    MultiFieldShuttle.regexResChar.indexOf(cfg.delimiter) != -1
      ? '\\' + cfg.delimiter
      : cfg.delimiter;
  var rx = new RegExp(escDel, 'g');
  if (mtch) {
    for (i = 0; i < mtch.length; i++) {
      optVal = optVal.replace(mtch[i], mtch[i].replace(rx, cfg.sub_delimiter));
    }
  }
  return optVal;
};

/*
 * If you want to make a field non-required you need to
 * add the avada-required field to the field tag and set it to false.
 * By default all fields are required.
 */
Shuttle.prototype.validateField = function(e, type) {
  var isValid = true;
  var isRequired = $.isAvadaRequired(e);
  if (type == 'checkbox' || !isRequired) {
    return true;
  } else if (type == 'select-multiple') {
    var selected = $(':selected', e);
    if (selected.length == 0) {
      isValid = false;
    }
  } else if (type == 'radio') {
    /*!!!!!!!!!!!!!!
     * Found and incredibly annoying jQuery bug.
     * After much debugging I discovered that:
     * $(":checked",e) is returning a query string with a space before appending ":checked".
     * So I was getting $("input:radio[name=radioField] :checked") which always returned length=0.
     * Hack is to just rebuild the css selector by contcat()ing the string.
     */
    var checked = $(e.selector.concat(':checked')); //HACK HACK HACK
    if (checked.length == 0) {
      isValid = false;
    }
  } else {
    var val = e.val();
    if (!val || val == '') {
      isValid = false;
    }
  }

  return isValid;
};

Shuttle.prototype.processFieldValue = function(e, type) {
  var shtl = this;
  var cfg = shtl.config;

  var val = '';
  if (type == 'select-multiple') {
    var vals = [];
    $('option:selected', e).each(function(ii, ee) {
        vals[ii] = ee.value;
    });
    if (vals) {
      val = val.concat('[', vals.join(cfg.sub_delimiter), ']');
    }
  } else if (type == 'radio') {
    var checked = $(e.selector.concat(':checked')); //HACK HACK HACK
    val = checked.val();
  } else if (type == 'checkbox') {
    var checked = $(e.selector.concat(':checked'));
    val = checked.length != 0 ? checked.val() : null;
  } else {
    var val = e.val();
  }
  return val;
};

Shuttle.prototype.processFieldLabel = function(e, type) {
  var cfg = this.config;

  var label;
  if (type == 'select-one') {
    label = $('option:selected', e).text();
  } else if (type == 'select-multiple') {
    var name = $(e).attr('name');
    var selVals = [];
    $('option:selected', e).each(function(ii, ee) {
      selVals[ii] = $(ee).text();
    });

    if (selVals.length == 0) {
      selVals[0] = 'Not Specified';
    }
    label = name.concat('[', selVals.join(cfg.label_sub_delimiter), ']');
  } else if (type == 'radio') {
    var id = $(e.selector.concat(':checked')).get(0).id; //HACK HACK HACK
    label = $("label[for='" + id + "']").html();
  } else if (type == 'checkbox') {
    var isChecked = $(e.selector.concat(':checked')).val() ? true : false;
    var name = e.attr('name');
    label = name.concat('[', isChecked, ']');
  } else {
    var label = e.val();
  }
  return label == null || label == '' ? 'Not Specified' : label;
};

Shuttle.prototype.validate = function() {
  var shtl = this;
  var cfg = shtl.config;
  var isValid = true;
  $(shtl.$fields)
    .filter(function(index) {
      var $field = this;
      return $field.is(':enabled') && $field.is(':not([readonly])');
    })
    .each(function(i, e) {
      var type = null;
      if (e && e.length != 0) {
        type = e[0].type;
      } else {
        // quit this iteration as type is mandatory to continue.
        isValid = false;
        return false;
      }
      isValid = shtl.validateField(e, type);
      if (!isValid) {
        alert('Please specify a value: ' + e.attr('id'));
        e.focus();
        return false;
      }
    });
  return isValid;
};

/** Add select fields to filter select */
Shuttle.prototype.addEntry = function() {
  var shtl = this;
  var cfg = shtl.config;
  var optValues = [];
  var optLabels = [];

  $(shtl.$fields)
    .filter(function(index) {
      var $field = this;
      return $field.is(':enabled') && $field.is(':not([readonly])');
    })
    .each(function(i, e) {
      var type = e[0].type;
      if (!($(e).attr('filter'))) {
        optValues[i] = shtl.processFieldValue(e, type);
        optLabels[i] = shtl.processFieldLabel(e, type);
      }
    });

  // concat two last values for between operand with sub_delimiter
  if (shtl.dynamicOperands && shtl.isBetweenOperandType(shtl.getOperandTypeInt())) {
    shtl.concatLastTwoElements(optValues, cfg.sub_delimiter);
    shtl.concatLastTwoElements(optLabels, cfg.sub_delimiter);
  }

  var optValue = optValues.join(cfg.delimiter);
  var existingOpt = null;
  try {
    optValueCompare = optValue.replace(/\\([\s\S])|(")/g, '\\$1$2');
    existingOpt = $('option[value="' + optValueCompare + '"]', shtl.$select);
  } catch (e) {
    alert('Problem parsing selected, probably a colon in value. jQuery bug');
  }
  if (existingOpt && existingOpt.length != 0) {
    alert('Entry already exists');
    shtl.$fields[0].focus();
    return false;
  }
  var optLabel = optLabels.join(cfg.label_delimiter);

  var option = new Option(optLabel, optValue);

  /*
   * jQuery's .append didn't work property, the appended option value
   * would get populated but not the label between <option></opyion> is
   * always empty. Worked in FF and Chrome, not sure why it's a problem in
   * IE Had to resort to working with DOM node instead of jQuery object,
   * lame contactsOpt.append(option); <-- doesn't work right in IE 8
   */
  var size = shtl.$select.get(0).options.length;
  shtl.$select.get(0).options[size] = option;
  return true;
};

Shuttle.prototype.concatLastTwoElements = function(array, delimiter){
  array.splice(array.length - 2, 2, array.slice(array.length - 2, array.length).join(delimiter));
}

Shuttle.prototype.splitLastElement = function(array, delimiter){
  const value = array[array.length - 1];
  array.splice(array.length - 1, 1);
  array.push.apply(array, value.split(delimiter));
}

/** delete contents of all field values and select options */
Shuttle.prototype.clearFields = function(removeOptions) {
  var shtl = this;
  removeOptions =
    removeOptions != null && removeOptions == false ? false : true;
  $.each(shtl.$fields, function(i, e) {
    var type = e.attr('type');
    if (!type && e.get(0).tagName.toLowerCase() == 'select') {
      type = 'select';
    }
    if (type == 'select' && removeOptions) {
      e.html('');
    } else if (type == 'checkbox') {
      e.attr('checked', false);
    } else {
      e.val('');
    }
  });
  return true;
};

/** select all options for select type fields */
Shuttle.prototype.selectSelects = function() {
  var shtl = this;
  $.each(shtl.$fields, function(i, e) {
    var type = e.attr('type');
    if (e.get(0).tagName.toLowerCase() == 'select') {
      e.select();
    }
  });
  return true;
};

/* in some cases, MQ Audit for example, we need to add a dummy option as we
 * add options on the fly and they are not mandatory
 */
Shuttle.prototype.setSelectDefault = function(def) {
  var shtl = this;
  $.each(shtl.$fields, function(i, e) {
    if ($.isAvadaRequired(e)) {
      return true;
    }

    var type = e.attr('type');
    if (
      e.get(0).tagName.toLowerCase() == 'select' &&
      $('option', e).length == 0
    ) {
      e.addOption('', def);
    }
  });
  return true;
};

/*
 * TODO potentially we could get rid of the custom jQuery method all together
 * and just just Javascript OO, consider for future refactor.  Want to stabalize before
 * attempting additional refactoring.
 */
jQuery.multiFieldShuttle = function(settings) {
  var shuttle = new Shuttle(settings);
  cfg = shuttle.config;
  MultiFieldShuttle.push(
    shuttle,
    cfg.fields,
    cfg.value_field,
    cfg.add,
    cfg.remove
  );
  shuttle.initShuttle();
  return shuttle;
};

/**
 * conditionBuilder
 * Extends: multiFieldShuttle
 * settings:
 *	"fields" : [], // condition fields
 *	"value_field" : null, //condition values
 *	"add" : "add_btn", // add condition button id
 *	"remove" : "remove_btn", //remove button id
 *	"delimiter" : '^', // condition value delimiter
 *	"label_delimiter" : '-', // condition label delimiter
 *	"sub_delimiter" : '-', // condition value sub delimiter
 *  "dflt": 11,  // default condition type
 *	"action": "" // action for repopulating operators"
 * }
 *
 * Usage: var cndBuilder =  $.conditionBuilder(settings);
 */

var CondBuilder = function(settings) {
  var cb = this;
  // apply condition builder specific defaults
  settings = $.extend({ dflt: 11, action: '' }, settings);
  // Call super constructor
  Shuttle.call(cb, settings);
  // continue with CB constructor
  var cfg = cb.config;

  cfg.fieldsNameConfig = cb.fieldsArrayToConfig(cfg.fields);
  cfg.fields = cb.configToValueArray(cfg.fieldsNameConfig);
  cb.$fields = $(cfg.fields).idsToElements();

  cb.$select = $.getById(cfg.value_field);
  cb.$addButton = $.getById(cfg.add);
  cb.$removeButton = $.getById(cfg.remove);

  // condition type
  cb.conditionType = cb.$fields[0];

  // condition operand
  cb.operand = cb.$fields[1];
  cb.dynamicOperands = true;

  // start date
  const startDateFieldId = cfg.fieldsNameConfig.dateStart;
  cb.dateStartVal = $.getById(startDateFieldId + 'Span');
  cb.dateStartValField = $.getById(startDateFieldId);

  // end date
  const endDateFieldId = cfg.fieldsNameConfig.dateEnd;
  cb.dateEndVal = $.getById(endDateFieldId + 'Span');
  cb.dateEndValField = $.getById(endDateFieldId);

  // date between
  cb.dashId = 'conditionDateValueBetweenSpan' + MultiFieldShuttle.conditionBuilderCntr;
  $(cb.dateStartVal).after("<span id='" + cb.dashId + "'> - </span>");
  cb.dateBetweenDash = $.getById(cb.dashId);

  // number
  const numberFieldId = cfg.fieldsNameConfig.number;
  cb.numVal = $.getById(numberFieldId + 'Span');
  cb.numValField = $.getById(numberFieldId);
  cb.numValField.val(0);

  // number between
  const numberEndFieldId = cfg.fieldsNameConfig.numberEnd;
  cb.numValEnd = $.getById(numberEndFieldId + 'Span');
  cb.numValEndField = $.getById(numberEndFieldId);
  cb.numValEndField.val(0);

  cb.numberDashId = 'conditionNumberValueEndSpan' + MultiFieldShuttle.conditionBuilderCntr;
  $(cb.numVal).after("<span id='" + cb.numberDashId + "'> - </span>");
  cb.numBetweenDash = $.getById(cb.numberDashId);

  // text
  const textFieldId = cfg.fieldsNameConfig.text;
  cb.textVal = $.getById(textFieldId + 'Span');
  cb.textValField = $.getById(textFieldId);

  // select
  const selectFieldId = cfg.fieldsNameConfig.select;
  cb.selValField = $.getById(selectFieldId);
  cb.selVal = $.getById(selectFieldId + 'Span');

  // filter field
  cb.conditionValue = '';
  const filterFieldId = cfg.fieldsNameConfig.filter;
  if (filterFieldId) {
    cb.conditionFilter = $([filterFieldId]).idsToElements()[0];
  }
  
  const dateFieldId = cfg.fieldsNameConfig.date;
  cb.dateValField = $.getById(dateFieldId);
  cb.dateVal = $.getById(dateFieldId + 'Span');
  
  const timeFieldId = cfg.fieldsNameConfig.time;
  cb.timeValField = $.getById(timeFieldId);
  cb.timeVal = $.getById(timeFieldId + 'Span');

  // inputs show api
  cb.inputs = {};
  cb.inputs.showTextField = function(){
    cb.dateStartVal.disableHide();
    cb.dateEndVal.disableHide();
    cb.dateBetweenDash.disableHide();
    cb.numValField.spinner('disable');
    cb.numVal.css('display', 'none');
    cb.selVal.disableHide();
    cb.textVal.enableShow();
    cb.numBetweenDash.disableHide();
    cb.numValEndField.spinner('disable');
    cb.numValEnd.css('display', 'none');
    cb.dateVal.disableHide();
    cb.timeVal.disableHide();
  };

  cb.inputs.showNumberField = function(){
    cb.dateStartVal.disableHide();
    cb.dateEndVal.disableHide();
    cb.dateBetweenDash.disableHide();
    cb.textVal.disableHide();
    cb.selVal.disableHide();
    cb.numBetweenDash.disableHide();
    cb.numValEnd.disableHide();
    cb.dateVal.disableHide();
    cb.timeVal.disableHide();
    if (cb.isEnabled) {
      cb.numValField.spinner('enable');
      cb.numVal.enableDisableElement(true);
      cb.numValField.enableDisableElement(true);
      cb.numValField.val(0);
      cb.numVal.css('display', 'inline');
    }
  };

  cb.inputs.showSelectField = function(){
    cb.selValField.sortSelect();
    cb.selVal.enableShow();
    cb.dateStartVal.disableHide();
    cb.dateEndVal.disableHide();
    cb.dateBetweenDash.disableHide();
    cb.numValField.spinner('disable');
    cb.numVal.css('display', 'none');
    cb.textVal.disableHide();
    cb.numBetweenDash.disableHide();
    cb.numBetweenDash.disableHide();
    cb.numValEndField.spinner('disable');
    cb.numValEnd.css('display', 'none');
    cb.dateVal.disableHide();
    cb.timeVal.disableHide();
  };

  cb.inputs.showDateBetweenFields = function(){
    cb.selVal.disableHide();
    cb.dateStartVal.enableShow();
    cb.dateEndVal.enableShow();
    cb.dateBetweenDash.disableHide();
    cb.numValField.spinner('disable');
    cb.numVal.css('display', 'none');
    cb.textVal.disableHide();
    cb.numBetweenDash.disableHide();
    cb.numValEndField.spinner('disable');
    cb.numValEnd.css('display', 'none');
    cb.dateVal.disableHide();
    cb.timeVal.disableHide();
  };

  cb.inputs.showNumberBetweenFields = function(){
    cb.dateStartVal.disableHide();
    cb.dateEndVal.disableHide();
    cb.dateBetweenDash.disableHide();
    cb.textVal.disableHide();
    cb.selVal.disableHide();
    cb.dateVal.disableHide();
    cb.timeVal.disableHide();

    if (cb.isEnabled) {
      cb.numValField.spinner('enable');
      cb.numVal.enableDisableElement(true);
      cb.numValField.enableDisableElement(true);
      cb.numValField.val(0);
      cb.numVal.css('display', 'inline-block');

      cb.numBetweenDash.enableShow();

      cb.numValEndField.spinner('enable');
      cb.numValEnd.enableDisableElement(true);
      cb.numValEndField.enableDisableElement(true);
      cb.numValEndField.val(0);
      cb.numValEnd.css('display', 'inline-block');
    }
  };

  cb.inputs.showDateTimeFields = function(){
    cb.selValField.sortSelect();
    cb.selVal.disableHide();
    cb.dateStartVal.enableShow();
    cb.dateEndVal.disableHide();
    cb.dateBetweenDash.disableHide();
    cb.numValField.spinner('disable');
    cb.numVal.css('display', 'none');
    cb.textVal.disableHide();
    cb.numBetweenDash.disableHide();
    cb.numValEndField.spinner('disable');
    cb.numValEnd.css('display', 'none');
    cb.dateVal.disableHide();
    cb.timeVal.disableHide();
  };
    
  cb.inputs.showOnlyDateFields = function(){
      cb.selValField.sortSelect();
      cb.selVal.disableHide();
      cb.dateStartVal.disableHide();
      cb.dateEndVal.disableHide();
      cb.dateBetweenDash.disableHide();
      cb.numValField.spinner('disable');
      cb.numVal.css('display', 'none');
      cb.textVal.disableHide();
      cb.numBetweenDash.disableHide();
      cb.numValEndField.spinner('disable');
      cb.numValEnd.css('display', 'none');
      cb.dateVal.enableShow();
      cb.timeVal.disableHide();
  };
  
  cb.inputs.showOnlyTimeFields = function(){
      cb.selValField.sortSelect();
      cb.selVal.disableHide();
      cb.dateStartVal.disableHide();
      cb.dateEndVal.disableHide();
      cb.dateBetweenDash.disableHide();
      cb.numValField.spinner('disable');
      cb.numVal.css('display', 'none');
      cb.textVal.disableHide();
      cb.numBetweenDash.disableHide();
      cb.numValEndField.spinner('disable');
      cb.numValEnd.css('display', 'none');
      cb.dateVal.disableHide();
      cb.timeVal.enableShow();
  };

  cb.getConditionTypeInt = function () {
    return cb.conditionType.val() && !isNaN(parseInt(cb.conditionType.val()))
        ? parseInt(cb.conditionType.val())
        : cb.config.dflt;
  };

  cb.getOperandTypeInt = function () {
    return cb.operand.val()
        ? parseInt(cb.operand.val())
        : undefined;
  };

  cb.isBetweenOperandType = function (operandId) {
    return operandId == cb.BETWEEN_OPERAND_ID;
  };

  cb.conditionType.change(function() {
      $.publish('reloadOperandlist');
  });

  if (cb.conditionFilter) {
    cb.conditionFilter.change(function() {
      $.publish('reloadTypelist');
    });
  }

  //TODO: depricate?
  cb.conditionType.click(function() {
    cb.conditionValue = '';
  });

  cb.conditionType.sortSelect();
  cb.conditionType.val(cfg.dflt);
  cb.conditionType.trigger('reloadOperandlist');

  $(cb.selValField).subscribe('reLoadOperandListSuccess', function(
    event,
    data
  ) {
    if (cb.conditionValue || cb.conditionValue != '') {
      var conditionArray = cb.conditionValue.split(cfg.delimiter);
      var oper = conditionArray[1];

      cb.operand.sortSelect();
      cb.operand.val(oper);
      cb.operand.trigger('change');
    }
  });

  $(cb.selValField).subscribe('conditionSelValueAlways', function(event, data) {
    if (!cb.conditionValue || cb.conditionValue == '') {
      return false;
    }
    var enabledFields = [];
    var conditionArray = cb.conditionValue.split($mfShuttle.delimiter);
    $(cb.$fields.slice(2))
      .filter(function(index) {
        var $field = this;
        return $field.is(':enabled') && $field.is(':not([readonly])');
      })
      .each(function(i, e) {
        enabledFields[i] = e;
      });
    $.each(enabledFields, function(i, e) {
      var type = e.attr('type');
      var tagName = e.prop('tagName').toLowerCase();
      var val = conditionArray[i + 2];
      if (tagName == 'select' && type != 'select-multiple') {
        $(e).val(val);
      }
    });
  });

  $(cb.conditionType).subscribe('reloadTypelist', function(){
    cb.loadTypesForFilter(false);
  });

  $(cb.operand).subscribe('reloadOperandlist', function() {
    var conditionTypeInt = cb.getConditionTypeInt();
    var action = cb.config.action;
    jQuery.ajax({
      type: 'POST',
      url: action,
      global: false,
      data: {
        conditionType: conditionTypeInt,
      },
      success: function(response) {
        $(cb.operand).populateSelect(response.conditionOperands);
        // below used to be handled by
        // reloadConditionValues event listener
        $(cb.selValField).populateSelect(response.conditionValues);
        $(cb.selValField).sortSelect();
        var conditionArray = cb.conditionValue.split(cfg.delimiter);
        var oper = conditionArray[1];

        if (oper) {
          cb.operand.val(oper);
          cb.operand.trigger('change');
          cb.setConditionValues(conditionArray);
        }
      },
    });

    cb.showInputs(conditionTypeInt, -1);
    if (!cb.isEnabled) {
      cb.disable();
    }
  });

  cb.showInputs = function (conditionTypeInt, operandTypeInt) {
    switch (conditionTypeInt) {
      case 4:
      case 230:
      case 231:
      case 232:
      case 233:
      case 234:
      case 241:
      case 245:
      case 246:
      case 250:
      case 251:
      case 252:
      case 257:
      case 259:
      case 12:
      case 13:
      case 33:
      case 74:
      case 268:
      case 269:
      case 274:
      case 275:
      case 276:
      case 277:
      case 279:
      case 280:
      case 281:
      case 282:
      case 284:
      case 285:
      case 286:
      case 287:
      case 288:
      case 289:
      case 290:
      case 291:
      case 292:
      case 293:
      case 294:
      case 298:
      case 302:
      case 303:
        cb.inputs.showTextField();
        break;
      case 16:
      case 27:
      case 28:
      case 61:
      case 62:
      case 63:
      case 66:
      case 67:
      case 71:
      case 72:
      case 73:
      case 253:
      case 242:
      case 243:
      case 238:
      case 260:
      case 261:
      case 262:
      case 263:
      case 237:
      case 240:
      case 239:
      case 249:
      case 283:
      case 295:
        cb.inputs.showSelectField();
        break;
      case 247:
      case 254:
        cb.inputs.showDateTimeFields();
        break
      case 270:
      case 272:
      case 296:
      case 300:
      case 304:
        cb.inputs.showOnlyDateFields();
        break;
      case 271:
      case 273:
      case 297:
      case 301:
      case 305:
        cb.inputs.showOnlyTimeFields();
        break;
      case 38:
        cb.inputs.showDateBetweenFields();
        break;
      default: // show spinner
        if (operandTypeInt == 11) {
          cb.inputs.showNumberBetweenFields();
        } else {
          cb.inputs.showNumberField();
        }
        break;
    }
  }

  cb.operand.change(function () {
    cb.showInputs(cb.getConditionTypeInt(), cb.getOperandTypeInt());
  });

  /**
   * when the page is first loaded and ajax callback for retrieving list of condition types
   * is complete we need to initialize the rest of the condition controls.
   * TODO: Remove me, don't think needed post struts to jquery.
   */
  $(cb.operand).subscribe('conditionTypesSuccess', function(event, data) {
    cb.conditionType.sortSelect();
    cb.conditionType.val(cb.config.dflt);
    cb.conditionType.trigger('reloadOperandlist');
  });

  // hack to allow user to input text into text field of spinner component..
  cb.numValField.focus(function() {
    $(this).attr('maxLength', '10');
  });
};

// CondBuilder extends Shuttle
CondBuilder.prototype = Object.create(Shuttle.prototype);

/* Set the "constructor" property to refer to CondBuilder.
 * This essentially overrides Shuttle().
 * We then call super constructor within CondBuilder();
 */
CondBuilder.prototype.constructor = CondBuilder;

// Shuttle() overrides

CondBuilder.prototype.setSelected = function (option) {
  var cb = this;
  var cfg = cb.config;
  cb.conditionValue = cb.getSelectedVal(option.val());
  var conditionArray = cb.conditionValue.split(cfg.delimiter);
  var cnd = conditionArray[0];
  var oper = conditionArray[1];


  const changeFilter = !cb.isSameFilter(cnd, cb.conditionType[0].options);
  if (changeFilter) {
    cb.toggleFilter(cb);
    cb.loadTypesForFilter(true, conditionArray, cnd, oper);
  } else {
    cb.refreshView(conditionArray, cnd, oper);
  }
};

CondBuilder.prototype.toggleFilter = function() {
  const cb = this;
  for (let i = 0; i < cb.conditionFilter.length; i++) {
    const option = $(cb.conditionFilter[i]);
    if (!option.prop("checked")) {
      option.prop("checked", true);
      break;
    }
  }
}

CondBuilder.prototype.isSameFilter = function(value, options) {
  for(let i = 0; i < options.length; i++){
    if (options[i].value === value) {
      return true;
    }
  }
  return false;
}

CondBuilder.prototype.BETWEEN_OPERAND_ID = 11;

CondBuilder.prototype.setConditionValues = function (conditionArray){
  const cb = this;

  if (cb.dynamicOperands && cb.isBetweenOperandType(cb.getOperandTypeInt())) {
    cb.splitLastElement(conditionArray, cb.config.sub_delimiter);
  }

  var enabledFields = [];
  $(cb.$fields.slice(2))
      .filter(function() {
        var $field = this;
        return $field.is(':enabled') && $field.is(':not([readonly])');
      })
      .each(function(i, e) {
        enabledFields[i] = e;
      });

  $.each(enabledFields, function(i, e) {
    var type = e.attr('type');
    var val = conditionArray[i + 2];
    if (type == 'select-multiple') {
      var valArr = val.substr(1, val.length - 2).split(cb.subDelimiter);
      $(e).val(valArr);
    } else if (type == 'radio') {
      e.attr('checked', false);
      var name = e.attr('name');
      $("[name='" + name + "'][value='" + val + "']").attr('checked', true);
    } else if (type == 'checkbox') {
      if (val && val != '') {
        e.attr('checked', true);
      } else {
        e.attr('checked', false);
      }
    } else {
      e.val(val);
    }
  });
}

CondBuilder.prototype.refreshView = function(conditionArray, cnd){
  const cb = this;

  cb.conditionType.val(cnd);
  cb.conditionType.trigger('change');
}

CondBuilder.prototype.loadTypesForFilter = function(setValues, conditionArray, cnd, operand) {
  var cb = this;
  let filter = '';
  $(cb.conditionFilter).each(function () {
    if ($(this).prop('checked')) {
      filter = $(this).val()
    }
  });
  jQuery.ajax({
    type: 'POST',
    url: cb.config.action,
    global: false,
    data: {
      filter: filter,
    },
    success: function (response) {
      $(cb.conditionType).populateSelect(response.conditionTypes);
      $(cb.conditionType).populateSelect(response.conditionTypes);
      $(cb.conditionType).sortSelect();
      if(setValues){
        cb.refreshView(conditionArray, cnd, operand);
      }
      else{
        $.publish('reloadOperandlist');
      }
    },
  });
}

CondBuilder.prototype.enable = function() {
  var cb = this;
  cb.isEnabled = true;

  cb.conditionType.enableDisableElement(true);
  cb.operand.enableDisableElement(true);

  cb.conditionType.trigger('change');
  cb.operand.trigger('change');

  cb.$select.enableDisableElement(true);
  cb.$addButton.enableDisableElement(true);
  cb.$removeButton.enableDisableElement(true);

  // clean up styles
  cb.conditionType.enableDisableStyle(true);
  cb.operand.enableDisableStyle(true);
  cb.dateStartValField.enableDisableStyle(true);
  cb.dateEndValField.enableDisableStyle(true);
  cb.numValField.enableDisableStyle(true);
  cb.numVal.enableDisableStyle(true);
  cb.textValField.enableDisableStyle(true);
  cb.dateValField.enableDisableStyle(true);
  cb.timeValField.enableDisableStyle(true);
  cb.selValField.enableDisableStyle(true);
  cb.numValEndField.enableDisableStyle(true);
  cb.numValEnd.enableDisableStyle(true);
};

CondBuilder.prototype.disable = function() {
  var cb = this;
  var cfg = cb.config;
  cb.isEnabled = false;

  cb.$select.enableDisableElement(false);
  cb.$addButton.enableDisableElement(false);
  cb.$removeButton.enableDisableElement(false);
  cb.conditionType.enableDisableElement(false);
  cb.operand.enableDisableElement(false);
  cb.dateStartValField.enableDisableElement(false);
  cb.dateEndValField.enableDisableElement(false);
  cb.numValField.enableDisableElement(false);
  cb.textValField.enableDisableElement(false);
  cb.numVal.enableDisableElement(false);
  cb.selValField.enableDisableElement(false);
  cb.numValEndField.enableDisableElement(false);
  cb.numValEnd.enableDisableElement(false);
  cb.dateValField.enableDisableElement(false);
  cb.timeValField.enableDisableElement(false);
  // clean up styles for condition builder.
  cb.conditionType.enableDisableStyle(false);
  cb.operand.enableDisableStyle(false);
  cb.dateStartValField.enableDisableStyle(false);
  cb.dateEndValField.enableDisableStyle(false);
  cb.numValField.enableDisableStyle(false);
  cb.numVal.enableDisableStyle(false);
  cb.textValField.enableDisableStyle(false);
  cb.selValField.enableDisableStyle(false);
  cb.numValEndField.enableDisableStyle(false);
  cb.numValEnd.enableDisableStyle(false);
  cb.dateValField.enableDisableStyle(false);
  cb.timeValField.enableDisableStyle(false);
};

CondBuilder.prototype.setDefaultType = function() {
  // set default condition type and trigger reload.
  var cb = this;
  var cfg = cb.config;
  cb.conditionType.val(cfg.dflt);
  cb.conditionType.trigger('change');
};

CondBuilder.prototype.setDefaultFilter = function() {
  $("#filterOther").prop("checked", true);
};

jQuery.conditionBuilder = function(settings) {
  cb = new CondBuilder(settings);
  var cfg = cb.config;
  MultiFieldShuttle.push(cb, cfg.fields, cfg.value_field, cfg.add, cfg.remove);
  cb.initShuttle();
  cb.setDefaultType();
  cb.setDefaultFilter();
  MultiFieldShuttle.conditionBuilderCntr++;
  return cb;
};

CondBuilder.prototype.fieldsArrayToConfig = function(fields){
  return {
    type: this.getElementByIndex(fields, 0),
    operand: this.getElementByIndex(fields, 1),
    dateStart: this.getElementByIndex(fields, 2),
    dateEnd: this.getElementByIndex(fields, 3),
    number: this.getElementByIndex(fields, 4),
    text: this.getElementByIndex(fields, 5),
    select: this.getElementByIndex(fields, 6),
    filter: this.getElementByIndex(fields, 7),
    numberEnd: this.getElementByIndex(fields, 8) || 'conditionNumValueEnd', // default value
    date: this.getElementByIndex(fields, 9),
    time: this.getElementByIndex(fields, 10)
  };
}

CondBuilder.prototype.configToValueArray = function (configObject){
  return $.map(configObject, function(value){
    return value;
  });
}


CondBuilder.prototype.getElementByIndex = function(array, index) {
  return (array && array.length > index) ? array[index] : undefined;
}
