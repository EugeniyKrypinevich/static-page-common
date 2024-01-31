//THIS IS A POTENTIAL PROBLEM BECAUSE METHODS FIRE WITH EVERY MOUSEOVER AND MOUSEOUT

//FOR GAUGE CHART: https://github.com/kluverua/Chartjs-tsgauge

Chart.pluginService.register({
    beforeDraw: function (chartInstance, easing) {
        //var helpers = Chart.helpers;
        //var ctx = chartInstance.chart.ctx;
        //var chartArea = chartInstance.chartArea;
        //ctx.fillStyle = chartInstance.config.options.chartArea.backgroundColor;
        //ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
        //ctx.save();
        
    }
});


Chart.LINE = "line";
Chart.GAUGE = "tsgauge";
Chart.BAR = "bar";
Chart.PIE = "pie";
Chart.POLAR = "polarArea";
Chart.RADAR = "radar";
Chart.DONUT = "doughnut";

Chart.YAXIS_NORMAL = 0;
Chart.YAXIS_PERCENT = 1;

var chartObjArray = [];


function createChart(chartObj) {
    $(chartObj.parentContainerCssSelector).append(createChartWrapper(chartObj));
    //line below: function is found in avada-spinner.js
    initializeSpinner("#"+chartObj.id+"Interval", 30, chartObj.chartRequest.refreshInterval, 0, 3600, false);
    if (chartObj.chartRequest.displayAttrTab) {
        initializeSpinner("#" + chartObj.id + "TimeDurationInterval", 1, chartObj.chartRequest.timeDuration, 0, 999999, false);
    }
    renderChart(chartObj);
    $("#"+chartObj.id+"Wrapper .chartContentWrapper").append("<div class='chart-setting'></div>");
    $("#"+chartObj.id+"Wrapper .chartContentWrapper .chart-setting").append("<div class='js-chart-legend'></div>");
    
    if (chartObj.chartRequest.displayAttrTab) {
        $("#" + chartObj.id + "Wrapper .chartContentWrapper .chart-setting").prepend(
            '<div class="form-group chart-attributes">' +
            '<label class="control-label">' + CHART_ATTRIBUTE_TIP + '</label>' +
            '<select id="' + chartObj.id + 'Attributes" class="form-control" multiple></select>' +
            '</div>'
        )
        
        $.each(chartObj.chartRequest.availableChartAttributes, function (key, value) {
            $('#' + chartObj.id + "Attributes").append(
                $('<option>', {
                    value: key,
                    text: value,
                    selected: chartObj.chartRequest.chartAttributes.includes(key)
                })
            );
        });
    }
    
    $("#"+chartObj.id+"Wrapper .js-chart-legend").html(chartObj.renderedChartObj.generateLegend());
    $("#"+chartObj.id+"Wrapper .js-chart-legend li").each(function(i){
        $(this).attr("index", i);
    });
    $("#"+chartObj.id+"Wrapper .js-chart-legend").append("<div class='js-chart-legend-full-text'></div>");
    
    let chartHeight = $("#" + chartObj.id).css("height");
    if(parseInt(chartHeight) < $("#" + chartObj.id + "Wrapper .js-chart-legend").height()) {
        $("#" + chartObj.id + "Wrapper .js-chart-legend").css("height", chartHeight);
        $("#" + chartObj.id + "Wrapper .js-chart-legend").css("overflow-y", "auto");
    }
    
    $("#"+chartObj.id+"Type").val(chartObj.config.type);
    createChartEvents(chartObj);
    
    $('#' + chartObj.id + 'Attributes').multiselect({
        columns: 1,
        placeholder: CHART_ATTRIBUTE_PLACEHOLDER,
        search: true,
        selectAll: true,
        maxHeight: 200,
        onOptionClick: function (element, option) {
            if ($(option).is(':checked')) {
                chartObj.chartRequest.chartAttributes.push($(option).val());
            } else {
                let index = chartObj.chartRequest.chartAttributes.indexOf($(option).val());
                chartObj.chartRequest.chartAttributes.splice(index, 1);
            }
        },
        onSelectAll: function (element, selected) {
            chartObj.chartRequest.chartAttributes = [];
            if (selected !== 0) {
                $(element).find("option").each(function () {
                    chartObj.chartRequest.chartAttributes.push($(this).val());
                })
            }
        }
    });
}

function createChartEvents(chartObj) {
    $("#" + chartObj.id + "Wrapper .js-chart-legend li").on("mouseover", function() {
        mouseOverChartLegend(this, chartObj);
    });
    $("#" + chartObj.id + "Wrapper .js-chart-legend li").on("mouseout", function() {
        mouseOutChartLegend(this, chartObj);
    });
    
    $("#" + chartObj.id + "Wrapper .js-chart-legend li").on('click', function() {
        var legendIndex = $(this).attr("index");
        var chartJsChart = getChartFromArray(chartObj).renderedChartObj;
        var meta = chartJsChart.getDatasetMeta(legendIndex);
        
        // See controller.isDatasetVisible comment
        meta.hidden = meta.hidden === null ? !chartJsChart.data.datasets[legendIndex].hidden : null;
        
        if(meta.hidden)
            $(this).addClass("chartLegendStrikethrough");
        else
            $(this).removeClass("chartLegendStrikethrough");
        
        chartJsChart.update();
        
    });
    
    $("#"+chartObj.id+"Interval").on("change", function(event, ui ) {
        chartIntervalProcess($("#"+chartObj.id+"Interval").val(), chartObj.id);
    });
    
    $("#"+chartObj.id+"Interval").on("spin", function(event, ui ) {
        chartIntervalProcess(ui.value, chartObj.id);
    });
    
    $("#"+chartObj.id+"TimeDurationInterval").on("change", function() {
        chartObj.chartRequest.timeDuration = $("#"+chartObj.id+"TimeDurationInterval").val();
    });
    
    $("#"+chartObj.id+"TimeDurationInterval").on("spin", function(event, ui ) {
        chartObj.chartRequest.timeDuration = ui.value;
    });
}

function mouseOverChartLegend(obj, chartObj) {
    $(obj).addClass("chartMouseOverLegend");
    var objScrollWidth =  Math.round($(obj).prop('scrollWidth'));
    var objWidth =  Math.round($(obj).width());
    if(!(objScrollWidth > objWidth)) //if there is no overflowing element, return....else, display full object name.
        return;
    
    var target = $(obj).parents(".js-chart-legend").children(".js-chart-legend-full-text");
    $(target).css("display","inline-block");
    $(target).text($(obj).text());
    
    var pos = {};
    var parentPosition = $(obj).parents(".js-chart-legend").position();
    var objectPosition = $(obj).position();
    var objectOffset = $(obj).offset();
    if(chartObj.isPortlet) {
        pos.left =  parentPosition.left - $(target).width() + 15 ;
        pos.top = parentPosition.top + objectPosition.top - 2;
    }else{
        pos.left =  objectOffset.left - $(target).width() - 20;
        pos.top = objectOffset.top - 45;
    }
    
    $(target).css("top", pos.top +"px");
    $(target).css("left", pos.left  + "px");
}

function mouseOutChartLegend(obj, chartObj) {
    $(obj).removeClass("chartMouseOverLegend");
    var target = $(obj).parents(".js-chart-legend").children(".js-chart-legend-full-text");
    $(target).css("display","none");
}

function getChartFromArray(chartObj) {
    for(i=0; i<chartObjArray.length; i++)  {
        if(chartObjArray[i].id == chartObj.id)
            return chartObjArray[i];
    }
}


function renderChart(chartObj) {
    // We are creating a new Chart, destroy any chart that may exist
    if (chartObj.renderedChartObj != null)
        chartObj.renderedChartObj.destroy();
    
    var ctx = $("#"+chartObj.id);
    
    //we set the options for the chartJs object here to allow more flexibility in the code (refer to chartConfigurationOptions.js)
    //chartObj.config.options = optionsFactory(chartObj);
    optionsFactory(chartObj);
    
    //console.log(chartObj);
    
    if(chartObj.title && chartObj.title.length > 0)
        chartObj.config.options.title.text = chartObj.title
    
    createColors(chartObj);
    //console.log(chartObj.config);
    chartObj.renderedChartObj = new Chart(ctx, chartObj.config);
    
    checkForExistingDataProcess(chartObj);
    
    //STEVE - not sure if we can remove data and labels (or entire chartJs object) prior to saving....probably should not unless we run into serious browser caching issues
    if (chartObjArray.includes(chartObj)) {
        let index = chartObjArray.indexOf(chartObj);
        chartObjArray[index] = chartObj;
    } else {
        chartObjArray.push(chartObj);
    }
    
    //important that this fires AFTER chartObj is pushed to array
    if(chartObj.chartRequest.refreshInterval > 0) {
        chartIntervalProcess(chartObj.chartRequest.refreshInterval, chartObj.id);
    }
    
    if(chartObj.isPortlet) {
        $("#" + chartObj.portletElementId).css("overflow","inherit"); //this stops scroll bars from popping up
        var chartLegendWidth = $("#"+chartObj.portletElementId + " .chartContent .js-chart-legend").width();
        var adjustedWidth = $("#"+chartObj.id).width() - chartLegendWidth;
        var keepThisHeight = parseInt($("#"+chartObj.id).css("height"));
        if(!isChartTypeGauge(chartObj)) {
            adjustedWidth -= 250;
            keepThisHeight -= 30;
            $("#"+chartObj.id).css("height",keepThisHeight+"px");
        }
        $("#"+chartObj.id).css("width", adjustedWidth+"px");
        $("#"+chartObj.id+"Wrapper .chartContent").css("min-width", adjustedWidth+"px");
        $("#"+chartObj.id+"Wrapper .chartContent").css("max-width", adjustedWidth+"px");
        $("#"+chartObj.id).css("height",keepThisHeight+"px");
    }
    
}

function optionsFactory(chartObj) {
    chartObj.config.options = null;
    //$.extend is a jQuery function which merges two js objects to create a new object....overwriting any matching properties of the first with the second.
    //careful with the syntax as removing the '{}' in the arguments will result in the first object being mutated.
    //https://api.jquery.com/jquery.extend/
    if(!chartObj.config.type && chartObj.type)//in case the type was created by user.
        chartObj.config.type = chartObj.type;
    
    if(chartObj.config.type == Chart.LINE) {
        chartObj.config.options = $.extend(true, {}, defaultChartOptions, defaultLineChartOptions);
        processAxisTypes(chartObj);
    }
    else
    if(chartObj.config.type == Chart.BAR) {
        chartObj.config.options = $.extend(true, {}, defaultChartOptions, defaultBarChartOptions);
        processAxisTypes(chartObj);
    }
    else
    if(chartObj.config.type == Chart.PIE) {
        chartObj.config.options = $.extend(true, {}, defaultChartOptions, defaultPieChartOptions);
    }
    else
    if(chartObj.config.type == Chart.RADAR) {
        chartObj.config.options = $.extend(true, {}, defaultChartOptions, defaultRadarChartOptions);
        processAxisTypes(chartObj);
    }
    else
    if(chartObj.config.type == Chart.POLAR) {
        chartObj.config.options = $.extend(true, {}, defaultChartOptions, defaultPolarChartOptions);
    }
    else
    if(chartObj.config.type == Chart.GAUGE) {
        chartObj.config.options = $.extend(true, {}, defaultChartOptions, defaultGaugeChartOptions);
    }
    if(chartObj.chartRequest.multiYAxis && !chartObj.changingChartType) { //critical to not run this if only changing the chart type as a user action
        //This single line of code below is absolutely necessary because of the way javascript binds arrays with value assignment.
        //If we don't, then the yAxisID assignment in the 2nd for statement will result in ALL array elements having the same value as the last array element.
        var optionsDuplicate = JSON.parse(JSON.stringify(chartObj.config.options.scales.yAxes[0]));
        var holdYaxisId = -1;
        for(var i=0; i<chartObj.config.data.datasets.length; i++) {
            if(i > 0 &&  holdYaxisId < chartObj.config.data.datasets[i].yAxisID) {
                chartObj.config.options.scales.yAxes.push((optionsDuplicate)); //duplicate settings from above for new yAxis definition
            }
            holdYaxisId = chartObj.config.data.datasets[i].yAxisID;
        }
        for(var x=0; x<chartObj.config.options.scales.yAxes.length; x++) {
            chartObj.config.options.scales.yAxes[x].id = chartObj.config.data.datasets[x].yAxisID;
            chartObj.config.options.scales.yAxes[x].scaleLabel.labelString = chartObj.config.data.datasets[x].yAxisLabel;
            chartObj.config.options.scales.yAxes[x].scaleLabel.fontColor = "#999";
            chartObj.config.options.scales.yAxes[x].scaleLabel.fontStyle = "italic";
            if(x > 0) {
                chartObj.config.options.scales.yAxes[x].gridLines = {};
                chartObj.config.options.scales.yAxes[x].gridLines.drawOnChartArea = false;
            }
        }
    }
    if(chartObj.isPortlet) {
        chartObj.config.options.maintainAspectRatio = false;
        //chartObj.config.options.responsive = false; //DO NOT SET THIS TO FALSE!!
    }
}

function processAxisTypes(chartObj) {
    //Handle any special yaxis scaling
    var yAxisObj;
    if(chartObj.chartRequest.yaxisType == Chart.YAXIS_NORMAL)
        yAxisObj = yAxesNormal;
    if(chartObj.chartRequest.yaxisType == Chart.YAXIS_PERCENT)
        yAxisObj = yAxesPercent;
    
    
    if(chartObj.chartRequest.yaxisType)
        yAxisObj[0].scaleLabel = {display: true, labelString:chartObj.chartRequest.yaxisLabel};
    
    if(chartObj.chartRequest.xaxisLabel)
        chartObj.config.options.scales.xAxes[0].scaleLabel = {display: true, labelString:chartObj.chartRequest.xaxisLabel};
    
    chartObj.config.options.scales.yAxes = yAxisObj;
    
}

function updateChartDataByInterval(chartObj) {
	if(chartObj.chartRequest.refreshInterval === 0) //double check to ensure we don't update when refresh interval set to zero.
		return;
    
    updateChartData(chartObj)
}

function updateChartDataByButton(chartObjId) {
    updateChartData(chartObjArray.find(x => x.id === chartObjId))
}

function getErrorMessage(message) {
    return '<div class="alert alert-danger alert-dismissible" role="alert">' +
        '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>' +
        '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>' + message +
        '</div>';
}

function updateChartData(chartObj) {
    if (chartObj.chartRequest.chartAttributes.length === 0 && chartObj.chartRequest.displayAttrTab ) {
        $('#action_result' + chartObj.id).show();
        $('#action_result' + chartObj.id).html(getErrorMessage(HEADER_noAttrsSelected));
        return;
    }
    
    chartObj.chartRequest.jsonData = "";
    var ajaxTimeout = chartObj.chartRequest.refreshInterval*999; //we want ajax timeout to expire before refresh fire
    $.ajax({
        url: CONTEXT_PATH + "/" + chartObj.chartRequest.refreshUrl,
        type: "POST",
        ignoreUiBlock: true,
        cache: false,
        dataType: 'json',
        data: {
            chartRequestJsonString: JSON.stringify(chartObj.chartRequest)
        },
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        timeout:  ajaxTimeout,
        success: function(json)
        {
            toggleChartLoadingIndicator(chartObj.id)
            
            if (json.statusCode === "-1")
            {
                var output = processServerMessages2(json, true);
                $('#chartErrors').html(output);
                return;
            }
            
            if (json.result.trim().length > 0) {
                chartObj.config.data = JSON.parse(json.result);
                renderChart(chartObj)
                $("#"+chartObj.id+"Wrapper .js-chart-legend").html(chartObj.renderedChartObj.generateLegend());
                $("#"+chartObj.id+"Wrapper .js-chart-legend li").each(function(i){
                    $(this).attr("index", i);
                });
                createChartEvents(chartObj);
            }
            else
                alert("No Chart data being returned from server to refresh the Chart, please check logs for issues.");
            
        },
        error: function (jqXHR, textStatus, errorThrown) {
            //console.error(textStatus + ": " + errorThrown); //this fires when there is no data to update....bizarre. Refreshing works though.
        }
    });
}


function checkForExistingDataProcess(chartObj) {
    //var messagePrefix = "NO DATA TO DISPLAY FOR<br>" + chartObj.title;
    /* TRY THIS TO SELECTIVEY TOGGLE DATASETS (ie....strike-through if all data values are zero or no data exists
     //Hide
        chart.getDatasetMeta(1).hidden=true;
        chart.update();

    //Show
        chart.getDatasetMeta(1).hidden=false;
        chart.update();
     */
    var messagePrefix = "DATA FOR SOME ENDPOINTS ARE NOT AVAILABLE";
    var errorCount = 0;
    var chartMessagesHtml = "";
    if(!chartObj.config.data ||
        !chartObj.config.data.datasets ||
        chartObj.config.data.datasets.length < 1) {
        errorCount++;
    }else{
        if(chartObj.config.type === Chart.GAUGE) {
            if(chartObj.config.data.datasets[0].gaugeData.length < 1)
                errorCount++;
        }else{
            for(var i=0; i<chartObj.config.data.datasets.length; i++) {
                if(chartObj.config.data.datasets[i].data.length < 1) {
                    errorCount++;
                    chartMessagesHtml += "<br>" + chartObj.config.data.datasets[i].label;
                }
            }
        }
    }
    if(errorCount > 0) {
        $("#"+chartObj.id+"Wrapper .chartMessages").html(messagePrefix);
        $("#"+chartObj.id+"Wrapper .chartMessages").css("display","inline");
    }else{
        $("#"+chartObj.id+"Wrapper .chartMessages").css("display","none");
    }
}


function updateAllChartsData() {
    for(var i=0; i<chartObjArray.length; i++) {
        updateChartDataByInterval(chartObjArray[i].id);
    }
}

function createColors(chartObj) {
    if(!chartObj.config.data ||
        !chartObj.config.data.datasets)
        return;
    
    var dataSetsLength = chartObj.config.data.datasets.length;
    var type = chartObj.config.type;
    var colors = createColorPalette(dataSetsLength);
    if(type === Chart.LINE ||
        type === Chart.BAR ||
        type === Chart.RADAR) {
        for(var i=0; i<dataSetsLength; i++) {
            chartObj.config.data.datasets[i].backgroundColor =  colors[i];
            chartObj.config.data.datasets[i].borderColor = colors[i];
        }
    }
    if(type === Chart.DONUT ||
        type === Chart.PIE ||
        type === Chart.POLAR) {
        for(var i=0; i<dataSetsLength; i++) {
            chartObj.config.data.datasets[i].backgroundColor =  colors;
            chartObj.config.data.datasets[i].borderColor = colors;
        }
    }
}

var paletteSelectionArray = []; //to do later....specify allowable color schemes a user can select. NOTE: do NOT include any color gradient schemes..refer to paletteInclude_greaterThan65 below

//these variables here are used to modify the paletteSelectionArray above to be presented to user in promptColorSchemeAction() below
var paletteExclude_greaterThan8 = ["cb-Accent", "cb-Dark2", "cb-Pastel2", "cb-Set2", "sol-base", "sol-accent"];
var paletteExclude_greaterThan9 = paletteExclude_greaterThan8.concat(["cb-BLues", "cb-BuGn", "cb-BuPu", "cb-GnBu", "cb-Greens",
    "cb-Greys", "cb-OrRd", "cb-Oranges", "cb-PuBu", "cb-PuBuGn",
    "cb-PuRd", "cb-Purples", "cb-RdPu", "cb-Reds", "cb-YlGn",
    "cb-YlGnBu", "cb-YlOrBr", "cb-YlOrRd", "cb-Pastel2", "cb-Set1"]);
var paletteExclude_greaterThan11 = paletteExclude_greaterThan9.concat(["cb-BrBG", "cb-PRGn", "cb-PiYG", "cb-PuOr", "cb-RdBu", "cb-RdGy", "cb-RdYlBu", "cb-RdYlGn", "cb-Spectral", "cb-Paired", "cb-Set3"]);
var paletteExclude_greaterThan12 = paletteExclude_greaterThan11.concat(["tol"]);
var paletteInclude_greaterThan65 = ["tol-sq", "tol-dv", "tol-rainbow", "rainbow"]; //NOTE: did not include the color gradient because I don't see why that would ever work. :-)

function createColorPalette(numOfColors, scheme) {
    if(!scheme)
        scheme = "tol-rainbow";
    colors = palette(scheme, numOfColors);
    
    //for future consideration when users can select color schemes
    if(!colors) {
        if(numOfColors > 8)
            promptColorSchemeAction(8);
        if(numOfColors > 9)
            promptColorSchemeAction(9);
        if(numOfColors > 11)
            promptColorSchemeAction(11);
        if(numOfColors > 12)
            promptColorSchemeAction(12);
        if(numOfColors > 65)
            promptColorSchemeAction(65);
    }
    
    for(var i=0; i<colors.length; i++) {
        colors[i] = "#" + colors[i];
    }
    return colors;
}

function promptColorSchemeAction() {
    //do something here later - SMILLER
}

function chartIntervalProcess(refreshInterval, chartId) {
    var chartObj = returnChartObjFromArray(chartId);
    chartObj.chartRequest.refreshInterval = refreshInterval;
    if(chartObj.chartRequest.refreshInterval > 0) {
        if(chartObj.intervalObj)
            clearInterval(chartObj.intervalObj);
        chartObj.intervalObj = setInterval(updateChartDataByInterval, refreshInterval*1000, chartObj);
    }else{
        if(chartObj.intervalObj) {
            clearInterval(chartObj.intervalObj);
        }
    }
}

//**************** CHART WRAPPER FUNCTIONS ********************/
var tab = "    ";

var chartCssClassSuffix = "";

function createChartWrapper(chartObj) {
    if(isChartTypeGauge(chartObj))
        chartCssClassSuffix = "Gauge";
    else
        chartCssClassSuffix = "LBR"; //line-bar-gauge
    var chartWrapperClass = "chartWrapper" + chartCssClassSuffix;
    if(chartObj.isPortlet){
        chartWrapperClass += " chartPortletWrapper";
    }
    var chartHeaderClass = "chartHeader";
    var chartContentClass = "chartContent";
    var chartMessagesClass = "chartMessages";
    var chartInterfaceClass = "chartInterface";
    
    if(!chartObj.wrapperClass)
        chartObj.wrapperClass = chartWrapperClass;
    if(!chartObj.headerClass)
        chartObj.headerClass = chartHeaderClass;
    if(!chartObj.contentClass)
        chartObj.contentClass = chartContentClass;
    if(!chartObj.messagesClass)
        chartObj.messagesClass = chartMessagesClass;
    if(!chartObj.interfaceClass)
        chartObj.interfaceClass = chartInterfaceClass;
    
    var html = "";
    html += '<div id="'+chartObj.id+'Wrapper" class="'+chartObj.wrapperClass+' chartWrapper">';
    html += tab+ '<div class="'+chartObj.headerClass+'">';
    html += tab+ _createInterface(chartObj);
    html += tab+ '<div class="'+chartObj.messagesClass+' chartMessages"></div>';
    html += tab+ '</div>';
    html += tab+ '<div id="action_result'+chartObj.id+'" class="action-result"></div>';
    html += tab+ '<div class="chartLoadingIndicator"><img src="common/images/indicator.gif" style="height:30px" /></div>';
    html += tab+ '<div class="chartContentWrapper">';
    html += tab+tab+ '<div class="'+chartObj.contentClass+'">';
    if(chartObj.isPortlet) {
        var h = $("#" + chartObj.targetWidgetContainerId).height() -
            $("#" + chartObj.targetWidgetContainerId + " .portletTitle").height() - 60; //70 is height of .chartHeader, but minimum of 60 seems to work
        
        var w = $("#" + chartObj.targetWidgetContainerId).width();
        if(chartObj.config.type === "line")
            html += tab+tab+tab+ '<canvas id="'+chartObj.id+'" class="chartCanvas" height="'+h+'" style="width: 100%"></canvas>';
        if(chartObj.config.type === "tsgauge")
            html += tab+tab+tab+ '<canvas id="'+chartObj.id+'" class="chartCanvas" height="'+h+'" width="'+w+'"></canvas>';
    }else{
        html += tab+tab+tab+ '<canvas id="'+chartObj.id+'" class="chartCanvas"></canvas>';
    }
    html += createTimeDurationInterval(chartObj);
    html += tab+tab+ '</div>';
    html += tab+tab+ '</div>';
    html += tab+ '</div>';
    html += tab+ '<input type="hidden" class=".chartSaveName" />';
    html += tab+ '<input type="hidden" class=".chartType" />';
    html += '</div>';
    return html;
}

function _createInterface(chartObj) {
    var html = "";
    html += '<div class="'+chartObj.interfaceClass+' chartHeaderInterface">';
    html += '<table border="1" class="chartHeaderInterfaceTable">';
    html += tab+ '<thead>';
    html += tab+tab+ '<tr>';
    if(!isChartTypeGauge(chartObj))
        html += tab+tab+tab+ '<th>Type</th>';
    if(!chartObj.isOpenChart)
        html += tab+tab+tab+ '<th>Refresh</th>';
    html += tab+tab+tab+ '<th>Save As</th>';
    html += tab+tab+ '</tr>';
    html += tab+ '</thead>';
    html += tab+ '<tbody>';
    html += tab+tab+ '<tr>';
    if(!isChartTypeGauge(chartObj))
        html += tab+tab+tab+ _createInterfaceTypeSelect(chartObj);
    if(!chartObj.isOpenChart)
        html += tab+tab+tab+ _createInterfaceInterval(chartObj);
    html += tab+tab+tab+ _createInterfaceSaveAs(chartObj);
    html += tab+tab+ '</tr>';
    html += tab+ '</tbody>';
    html += '</table>';
    html += '</div>';
    return html;
}

function createTimeDurationInterval(chartObj) {
    var html = "";
    if (!chartObj.chartRequest.displayAttrTab) {
        return html;
    } else {
        html += '<div class="form-group chart-duration text-right">';
        html += '<label class="control-label">Time Duration(Minutes)</label>';
        html += tab+ '<input type="text" id="'+chartObj.id+'TimeDurationInterval" size="6" />';
        html += '</div>';
        return html;
    }
}

function _createInterfaceInterval(chartObj) {
    var html = "";
    html += '<td class="chartInterval">';
    html += '<input type="text" id="'+chartObj.id+'Interval" size="2"/>';
    html += tab+ '<button id="'+chartObj.id+'RefreshBtn" class="btn" onclick="updateChartDataByButton(\''+chartObj.id+'\')" >Update</button>';
    html += '</td>';
    return html;
}

function _createInterfaceTypeSelect(chartObj) {
    var html = "";
    html += '<td class="chartType">';
    html += tab+ '<select id="'+chartObj.id+'Type" class="btn" onChange="changeChartType(this, \''+chartObj.id+'\')">';
    html += tab+tab+ '<option class="btn" value="'+Chart.LINE+'" selected>Line</option>';
    html += tab+tab+ '<option class="btn" value="'+Chart.BAR+'">Bar</option>';
    if(!chartObj.chartRequest.multiYAxis)
        html += tab+tab+ '<option class="btn" value="'+Chart.RADAR+'">Radar</option>';
    html += tab+ '</select>';
    html += '</td>';
    return html;
}

function _createInterfaceSaveAs(chartObj) {
    var html = "";
    html += '<td class="chartSaveAs">';
    html += tab+ '<button class="chartSavePdfButton btn" onclick="saveChartFile(\''+chartObj.id+'\', \'pdf\')">PDF</button>';
    html += tab+ '<button class="chartSavePngButton btn" onclick="saveChartFile(\''+chartObj.id+'\', \'png\')">PNG</button>';
    html += tab+ '<button class="chartSavePortletButton btn" onClick="showChartPortletModal(\''+chartObj.id+'\')">Portlet</button>';
    html += '</td>';
    return html;
}


//************ CHART USER INTERACTION ***********************/

function changeChartType(element, id) {
    var chartObj = returnChartObjFromArray(id);
    chartObj.config.type = element.value;
    //chartObj.config.options = optionsFactory(chartObj);
    chartObj.changingChartType = true;
    renderChart(chartObj);
}


function saveChartFile(chartId, fileType) {
    $("#chartSaveModal").modal("show");
    $("#saveFileType").val(fileType);
    var chartObj = returnChartObjFromArray(chartId);
    $("#chartBase64Data").val(chartObj.renderedChartObj.toBase64Image());
    
}




//********** UTILITY FUNCTIONS WITHIN THIS PAGE ONLY (private) ****************************//
function returnChartObjFromArray(chartId) {
    for(var i=0; i<chartObjArray.length; i++) {
        if(chartObjArray[i].id == chartId)
            return chartObjArray[i];
    }
    return null;
}

function toggleChartLoadingIndicator(chartId) {
    $("#" + chartId + "Wrapper .loadingIndicator").toggle();
}

function isChartTypeGauge(chartObj) {
    return chartObj.config.type == Chart.GAUGE
}


//************** DASHBOARD PORTLET-RELATED CODE *************************//

Chart.loadAsJSONPortlet = function(portletJson, portletElementId, widgetContainerId) {
    var portletSetGuid = $("#" + portletElementId).closest(".portalWindow").attr("psguid");
    var chartRequest = {};
    if(portletJson.guid) { //detect if old format
        chartRequest.chartGuid = portletJson.guid;
        chartRequest.id = portletJson.id;
    }else{
        chartRequest = portletJson;
    }
    
    $.ajax({
        url: CHART_DISPLAY_PORTLET_URL,
        cache: false,
        type: "post",
        dataType: 'json',
        data: {chartRequestJsonString: JSON.stringify(chartRequest)},
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        timeout: ajaxTimeout,
        success: function(json) {
            
            if (json.statusCode === "-1")
            {
                var output = processServerMessages2(json, true);
                $('#chartErrors_' + widgetContainerId).html(output);
                return;
            }
            
            if (json.result && json.result.trim().length > 0) {
                var chartObj = JSON.parse(json.result);
                chartObj.targetWidgetContainerId = widgetContainerId;
                chartObj.id = chartRequest.id + "_canvas";
                chartObj.parentContainerCssSelector = "#" + portletElementId;
                chartObj.portletElementId = portletElementId;
                chartObj.isPortlet = true;
                createChart(chartObj);
            }
            else
                alert("No Chart data being returned from server, please check logs for issues.");
            
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log("AJAX ERROR! ==========================");
            console.log("Chart.loadAsJSONPortlet error thrown: " + errorThrown);
            console.log("Status: " + textStatus);
            console.log(jqXHR);
            console.log("======================================");
        }
    });
};



function showChartPortletModal(chartId) {
    $("#chartId").val(chartId);
	$("#chartPortletSaveMessage").empty();
	$("#chartPortletSaveName").val("");
	$("#chartPortletSaveTitle").val("");
	$("#chartPortletSaveModal").modal("show");
}

Chart.saveAsJSONPortlet = function() {
    var chartId = $("#chartId").val();
    var chartObj = returnChartObjFromArray(chartId);
    var chartPortletSaveName = $("#chartPortletSaveName").val();
    var chartPortletTitle = $("#chartPortletSaveTitle").val();
    if(!chartPortletSaveName) {
        $("#chartPortletSaveMessage").text("Must enter a name for this chart portlet");
        return;
    }
    
    var chartPortlet = {
        portletName: chartPortletSaveName,
        chartTitle: chartPortletTitle,
        chartRequest: chartObj.chartRequest
    }
    
    $.ajax({
        url: CHART_PORTLET_SAVE_URL,
        type: "post",
        dataType: 'json',
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        data: {jsonObject : JSON.stringify(chartPortlet)},
        cache: false,
        success: function(data) {
            chartHandleJsonResults(data, chartId);
            //$("#chartPortletSaveModal").modal("hide");
        },
        error:  function(jqXHR, textStatus, errorThrown) {
            console.log("AJAX ERROR! ==========================");
            console.log("Chart.saveAsJSONPortlet error thrown: " + errorThrown);
            console.log("Status: " + textStatus);
            console.log(jqXHR);
            console.log("======================================");
        }
    });
    
};

function chartHandleJsonResults(json, id) {
    if (json != null) {
        var output = processServerMessages2(json, false);
        $("#chartPortletSaveMessage").html(output);
    }
}
