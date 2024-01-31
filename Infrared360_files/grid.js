var GRID = {}; //this allows for externally-called grid-specific functions to prevent potential inadvertant naming conflicts elsewehere in the code as well as being explicit.
var MAX_COL_WIDTH = 350;
var MIN_COL_WIDTH = 50;
var GRIDS = new Map();
GRID.isMultipleGrids = false;

//*******************************
// Externally-called functions (start with GRID.*)
GRID.loadGrid = function(gridObj) {
	createGridTableProcess(gridObj);
}

GRID.loadAsJSONPortlet = function(gridObj) {
	gridObj.isPortlet = true;
	gridObj.colModel = gridObj.colModelKey;
	createGridTableProcess(gridObj);
};

GRID.saveAsJSONPortlet = function() {
	saveAsJSONPortlet();	
}

GRID.hasRows = function(gridId) {
	if($("#"+gridId).DataTable().data().length === 0)
		return false;
	else
		return true;
}

GRID.checkSelectedRows = function (event) {
    var rows = GRID.getSelectedRows($('#gridId').val());
    if (!rows) {
        event.stopPropagation();
    }
}

GRID.stopAutoRefresh = function (gridId) {
	let grid = GRIDS.get(gridId);
	clearInterval(grid.autoRefreshIntervalId)
}

GRID.initializeAutoRefreshGrid = function(gridId) {
	var grid = GRIDS.get(gridId);
	grid.autoRefreshIntervalId = setInterval(function() { GRID.autoRefreshProcess(gridId); }, grid.refreshInterval);
}

GRID.autoRefreshProcess = function(gridId) {
	GRID.refreshGrid(gridId);
}

GRID.getSelectedRows = function(gridId, allowEmptySelect) {
	var rowsData = $("#"+gridId).DataTable().rows({selected: true}).data();
	if (rowsData.length < 1 && !allowEmptySelect) {
      alert(HEADER_noRowsSelected);
      return null;
    }
	return rowsData;
}

GRID.getSelectionMode = function (gridId) {
    return $("#" + gridId).DataTable().settings()[0]._avadaRowSelect._getRequestSelectionMode();
}

GRID.searchContent = function (gridId, searchValue) {
    $('#' + gridId).DataTable().search(searchValue).draw();
}

GRID.getSelectedGuids = function(gridId, allowEmptySelect) {
	var rowsData = GRID.getSelectedRows(gridId, allowEmptySelect);
	if (!rowsData) {
      return null;
    }	
	var guids = [];
	for(i=0; i<rowsData.length; i++) {
		guids.push(rowsData[i].guid);
	}
	return guids;
}

GRID.updateUrlAndRefresh = function(gridId, _url) {
    const grid = GRIDS.get(gridId)
    grid.url = _url;
	$("#"+gridId).DataTable().ajax.url(_url).load(function(response) {
        if($.isFunction(grid.callback)){
            grid.callback.call(this, grid, response);
        }
	}, false);
};

GRID.refreshGrid = function(gridId, externalJsonMessage) {
	var g = GRIDS.get(gridId);
    g.sendUseCacheFlag = true;
	if (externalJsonMessage) {
		gridHandleJsonResults(externalJsonMessage, g);
	}
	//always force a fresh reload to avoid caching per Rob
	var url = g.url;
	if (!url.includes("forceGridReload=true")) {
		url += url.indexOf("?") > -1 ? "&forceGridReload=true" : "?forceGridReload=true"
	}
		
	//$("#"+gridId).DataTable().ajax.reload();
	//$("#"+gridId).DataTable().ajax.url(url).load();
	GRID.updateUrlAndRefresh(gridId, url);
}

GRID.commonFindPageGridLoader = function(gridObj) {
	
	GRID.isMultipleGrids = true;

	if(! gridObj.urlSuffix)
		 gridObj.urlSuffix = "";
	
	gridObj.id = gridObj.gridId;
    
    gridObj.url = HEADER_namespace.substring(1) + '/' + gridObj.url + gridObj.urlSuffix;
	gridObj.colModelFile = HEADER_namespace.substring(1) + '/find.js';  //substring(1) to ignore leading forward slash;
		
	if(!gridObj.sortName)
		gridObj.sortName = "name";

    let gridStateJson;
    if (GRIDS.has(gridObj.id)) {
        /*
         A destruction operation will remove a state from the grid.
         We store it before and reuse this state during the rebuild process.
         Otherwise, all search, order, and resizing options will be removed.
         */
        const dt = $("#" + gridObj.id).DataTable();
        gridStateJson = JSON.stringify({grids: {[gridObj.id]: dt.state()}});
        dt.destroy();
    }
	$("#" + gridObj.id + "Show").css("display", "block");
	createGridTableProcess(gridObj, gridStateJson);
};

GRID.cleanGridsForReloading = function() {
	//TODO: force an unload or equivalent	
}

/*
Grid.cleanGridsForReloading = function() {
	saveGridState();
	Grid.unloadAllGrids();
	Grid.gridArray = [];
}
*/

GRID.unloadAllGrids = function() {
	//TODO: force an unload or equivalent
};

/*
Grid.unloadAllGrids = function() {
	for (var i = 0; i < Grid.gridArray.length; i++) {
		$('#' + Grid.gridArray[i].id).jqGrid('GridUnload');
	}
}
*/

//*******************************

const SELECTOR_ICON_CODE = '<input type="checkbox"/>';

$(window).bind('beforeunload', saveGridState);

function createGridTableProcess(gridObj, gridStateJson) {
    //SMILLER - we do this because conversion from previous gridCode used colModel differently (the name of the colModel variable in the old version).
    //This version overwrites it with a derived colModel from retrieving the script which is also undergoes some conversion/modification.
	//In the rush to get this up to speed, colModel was kept globally in the many hundreds of gridTable construction. 
	//Long term goal should be to change that reference globally to colModelKey.
	//For now, unless we do this, it causes issues with grid portlets.
    gridObj.colModelKey = gridObj.colModel;
    if (!gridStateJson) {
        $.ajax({
            url: HEADER_retrieveGridStateInUserSessionUrl,
            dataType: 'json',
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
            cache: false,
            global: false,
            data: {pageURI: PAGE_URI},
            success: function (gridStateJson) {
                initGridTableWithColModel(gridObj, gridStateJson);
            } //end of ajax success to get grid state
        });
    } else {
        initGridTableWithColModel(gridObj, gridStateJson);
    }
}

function initGridTableWithColModel(gridObj, gridState){
    $.getScript(HEADER_dataTablesConfigPath + gridObj.colModelFile)
        .done(function (script, textStatus) {
            var _colNames = null;
            try {
                if (typeof gridObj.colModel === "string") {
                    if (gridObj.colModel === "colModel") {
                        try {
                            _colNames = eval("colNames");
                        } catch (err) {
                            _colNames = null;
                        }
                    } else {
                        var colReference = gridObj.colModel.substring(0, gridObj.colModel.indexOf("ColModel"));
                        try {
                            _colNames = eval(colReference + "ColNames");
                        } catch (err) {
                            _colNames = null;
                        }
                    }
                }
            } catch (err) {
                var tempErrorMessage = "IR360 GENERATED ERROR: " + err;
                if (gridObj.isPortlet) {
                    $("#" + gridObj.id + "_loadingIndicator").css("display", "none");
                    $("#" + gridObj.id + "Messages").append("<div style='display:block;color:red'>Grid not loaded due to " + tempErrorMessage + ". Please contact support.</div>");
                } else {
                    $("#" + gridObj.id).append("<div style='display:block;color:red'>Grid not loaded due to " + tempErrorMessage + ". Please contact support.</div>");
                }
                return;
            }
            gridObj.colModel = eval(gridObj.colModel);
            if (_colNames) {
                for (i = 0; i < _colNames.length; i++) {
                    gridObj.colModel[i].title = _colNames[i];
                }
            }
            createGridTable(gridObj, gridState);
        }); //end of done to $get script
}

function createGridTable(gridObj, gridStateJson) {

	if(gridStateJson) {
		try{
			let gridStage = JSON.parse(gridStateJson).grids[gridObj.id];
			if(gridObj.group && !gridStage.group) {
				let idx = gridObj.colModel.map(column => column.data).indexOf(gridObj.groupColumn);
				gridStage.order = [[idx, "asc"]];
			}
			gridObj.gridState = gridStage;
		}
		catch(e) {
			gridObj.gridState = null;
		}
	}
	
	//scrollResize forces grid table to resize within constraint of parent element
	//this is critical for portlets.
	//might refer to this in the future for non-portlet grids should the need arise.
	//Refer to https://datatables.net/blog/2017-12-31 
	//This might be useful as well: https://datatables.net/blog/2015-04-10
	if(gridObj.isPortlet) {
		gridObj.scrollResize = true;
	}else{
		gridObj.scrollResize = false;
	}
	
	
	gridObj.groupHeaderStateMap = new Map();
	
	if(typeof gridObj.multiSelect === "undefined") {
		gridObj.multiSelect = true;
	}
	
	if(gridObj.alwaysLoadPageOne) {
		//TODO: force reset to pager value 1
	}
	
	gridObj.frozenColumns = 0;
	if(gridObj.multiSelect)
		gridObj.frozenColumns++;
	
	if(gridObj.isPortlet) {
		gridObj.saveState = false;
	}else{
		gridObj.saveState = true;
	}

	for (var i = 0; i < gridObj.colModel.length; i++) {
		if (gridObj.colModel[i].frozen) {
			gridObj.frozenColumns++;
		}

		if (gridObj.colModel[i].classes && gridObj.colModel[i].classes.indexOf('avada-grid-column-wrap') > -1) {
			gridObj.columnWrapping = true;
			if (!gridObj.colModel[i].width)
				gridObj.colModel[i].width = MAX_COL_WIDTH;
		}
		
		if(gridObj.sortName) {
			if(gridObj.sortName == gridObj.colModel[i].data) {
				var idx = i;
				if(gridObj.multiSelect)
					idx++;					
				gridObj.order = [[idx, "asc"]];
			}
		}
		
		
		if(gridObj.group) {
			if(gridObj.groupColumn) {
				if(gridObj.colModel[i].data == gridObj.groupColumn) {
					gridObj.group = {
        						dataSrc: gridObj.groupColumn
    						}
				}
			}else{
				alert("you need to specifiy a 'groupColumn' definition with 'group' when calling GRID.loadGrid.");
				return;
			}	
		}else{
			gridObj.group = false;
		}

        // hide service columns
        if (gridObj.colModel[i].visible === false) {
            gridObj.colModel[i].className = 'noVis';
        }
	}

    if (gridObj.multiSelect) {
        gridObj.colModel.unshift({
            defaultContent: '<div class="gridSelectedRowIcon">' + SELECTOR_ICON_CODE + '</div>',
            className: "gridSelectorColumn noVis", width: "30px", orderable: false, searchable: false, frozen: true
        });
    } else {
        gridObj.select = false;
    }

	if(!gridObj.serverSide)
		gridObj.serverSide = false;
		
	if(!gridObj.ajaxType)
		gridObj.ajaxType = "POST";
	
	GRIDS.set(gridObj.id, gridObj);


	var buttonsArray = [
        	{
				extend: "colvis",
				attr: {
					title: "Show/Hide Columns",
                    class: "customButton colVisButton"
				},
                columns: ':not(.noVis)',
                text: '<svg aria-hidden="true"><use xlink:href="#columnsIcon"></use></svg>'
			},
			{
				attr: {
					class: "customButton",
					title: "Refresh",
					onClick: "GRID.refreshGrid('" + gridObj.id + "')"
				},
                text: '<svg aria-hidden="true"><use xlink:href="#refreshIcon"></use></svg>'
			},
			{	
				attr: {
					class: "customButton",
					title: "Clear State",
					onClick: "showGridStateModal('" + gridObj.id + "')"
				},
                text: '<svg aria-hidden="true"><use xlink:href="#resetIcon"></use></svg>'
			},
        	{
				extend: "csv",
                attr: {
                    class: "customButton",
                    title: "Download CSV"
                },
                text: '<svg aria-hidden="true"><use xlink:href="#downIcon"></use></svg>'
			}
        ];

	if(!gridObj.serverSide) { //Disabled for now on serverSide because of complexity of implementation all various search criteria.   
		buttonsArray.push({
			extend: "searchBuilder",
			attr: {
				class: "searchBuilderButton",
				title: "Search Builder"
			}
		})
	}

	if(!gridObj.disableCreatePortlet) {
		buttonsArray.push({	
				attr: {
					class: "createPortletButton",
					title: "Create Portlet",
					onClick: "showGridPortletModal('" + gridObj.id + "')"
				},
                text: '<svg aria-hidden="true"><use xlink:href="#portletIcon"></use></svg>'
			});
	}

	var pageRowValue = HEADER_PAGE_ROW_OPTIONS[0];
    
    // The conditions parameter has | in the value we need to encode this value to avoid errors
    let urlPrefix = gridObj.url.substring(0, gridObj.url.indexOf("?")+1);
    let urlAfter = gridObj.url.substring(gridObj.url.indexOf("?")+1);
    
    let searchParams = new URLSearchParams(urlAfter);
    if (searchParams.has("conditions")
    && searchParams.get("conditions") != '0')
    {
        let conditions = searchParams.get("conditions");
        searchParams.delete("conditions");
        searchParams.set("conditions",  encodeURIComponent(conditions));
        
        url = urlPrefix + searchParams.toString();
    }
    else
        url = gridObj.url;
    
	var gridTableInit = {
        ir360GridConfig: gridObj,
		ajax: {
			url: url,
			dataType: "json",
			contentType: "application/x-www-form-urlencoded; charset=UTF-8",
			dataSrc: "gridModel",
			type: gridObj.ajaxType,
    		data: function (d) {
				//because of yet ANOTHER bug in DataTables we have to do some twisted, special logic to send the searchBuilder data via ajax to the server
				//when serverSide = true;
                const dt = $("#" + gridObj.id).DataTable();
				if(gridObj.serverSide && dt.searchBuilder) {
					try { //we do this because getDetails throws error before the gridTable fully loads. 
						if(dt.getDetails()) {
							d.searchBuilder = dt.searchBuilder.getDetails();
						}
					}catch(ex) { } //no actiona needed here, just abit of a hack to work around DataTables bugs
				}

                // cancel previous request if exist
                if (dt.settings()[0].jqXHR)
                    dt.settings()[0].jqXHR.abort();

                var ajaxData = {};

                ajaxData.gridTableRequest = JSON.stringify(d);

                if(gridObj.postData)
                    ajaxData.postData = JSON.stringify(gridObj.postData);

                if (gridObj.sendUseCacheFlag) {
                    ajaxData.useCache = true;
                    gridObj.sendUseCacheFlag = false;
                }
                ajaxData.selectionMode = gridObj.selectionMode;
				return ajaxData;
			}
		},
		//scroller: true, // PROBLEM: When responsive = true, causes expander icons and functionality to engage.....not what we want 
		//	this will also disable paging and engages auto paging when scrolling....something to consider down the road...but too much of a change for now.
		//	https://datatables.net/extensions/scroller/ 
		//responsive: true, //DO NOT USE!! width adjustments screwed up on page shrink. PROBLEM: First, you have to downlaod the "Responsive" option with DataTables. Second, "visible: false" will no longer work. 
		//colResize: colResizePluginOptions, this does NOT work when colReorder = true (relies on 3rd party plugin)
        //data: jsonData.gridModel,

        fixedColumns: {
            left: gridObj.frozenColumns
        },
        columns: gridObj.colModel,
        /*
        columnDefs: {
			//type: "natural",
			type: "natural-nohtml",
			//type: "any-number",
			//type: "num",
			//targets: '_all'
			targets: [ 0, 1, 2, 3, 4, 5, 6, 7, 8]
		},
		*/
		retrieve: true,
		serverSide: gridObj.serverSide,
		search: {return: true},
		scrollResize: gridObj.scrollResize,
        scrollY: 200,
        scrollX: true,
        scrollCollapse: true,
        deferRender: true, //https://datatables.net/reference/option/deferRender
        //select: gridObj.select,
        processing: true, //Enable or disable the display of a 'processing' indicator
        order: gridObj.order,
        ordering: gridObj.ordering,
		pageLength: pageRowValue,
		pagingType: "full_numbers",
		lengthMenu: [HEADER_PAGE_ROW_OPTIONS, HEADER_PAGE_ROW_OPTIONS],
		rowGroup: gridObj.group,
        searchBuilder:{//https://datatables.net/extensions/searchbuilder/
			return: true
		},
        //searchPanes:{}, //DO NOT leave a blank configuration //https://datatables.net/extensions/searchpanes/
        //dom: 'Bfrtip', //this is needed in order to display the buttons using "B". Other letters referenced here: https://datatables.net/reference/option/dom   
        // do not use ColReorder plugin (R symbol), because we use a custom implementation of the ColReorderWithResize plugin (dataTables.avada.colReorderWithResize.js). ColReorderWithResize initialized manually few lines below (new $.fn.dataTable.ColReorder(gridTable);)
        sDom: '<"collapsable-grid"<"#' + gridObj.id + '-collapsable-header.collapsable-grid-header"><"gridTopGroup"r<"gridInfoGroup"<"gridInfo"i><"gridRowsDisplay"l>><"gridSearch"f>><"#' + gridObj.id + '-collapsable-block.collapsable-grid-block"t<"bottom"B<"dt-footer"p>>>>J',
        //NOTE: there are a variety of options for buttons. https://datatables.net/reference/button/
		language: {
			searchBuilder: {
                button: '<svg aria-hidden="true"><use xlink:href="#searchBuilderIcon"></use></svg>'
            },
			lengthMenu: '_MENU_ rows',
      		info: '_START_ to _END_ of _TOTAL_ entries',
			paginate: {
      			previous: "<",
				next: ">",
				first: "<<",
				last: ">>"
    		}
		},
        buttons: buttonsArray,
        createdRow: function (row) {
            $.each($('td', row), function () {
                $(this).attr('title', $(this).text());
            });
        },
        drawCallback: function(dt) { /**NOTE - this fires 2-3 times per load (and I contend a bug) - try not to use */
            groupingProcess(gridObj);
		},
        initComplete: function () {
            /**NOTE - this fires only once per load */
            adjustedGridTableHeight = "";
            gridRowHeight = $("#" + gridObj.id + "_wrapper .dataTables_scrollBody td").first().height() + 1;
            if (GRID.isMultipleGrids) {
                adjustedGridTableHeight = ((gridRowHeight + 1) * HEADER_GRID_ROWS_MULTIPLE_TABLES) + "px";
            } else {
                adjustedGridTableHeight = ((gridRowHeight + 1) * HEADER_GRID_ROWS) + "px";
            }

            $("#" + gridObj.id + "_wrapper .dataTables_scrollBody").css("maxHeight", adjustedGridTableHeight);

            if (gridObj.refreshInterval && gridObj.refreshInterval > 0)
                GRID.initializeAutoRefreshGrid(gridObj.id);

            if (gridObj.customGridTableFunction) {
                customGridTableFunction();
            }

            $("#" + gridObj.id + "_wrapper .dataTables_scrollHead table").append("<tfoot><tr></tr></tfoot>");

            $("#" + gridObj.id).trigger("avada:gridComplete:gridId=" + gridObj.id);
        },
        stateSave: gridObj.saveState,
        stateSaveCallback: function (settings, data) {
			if(gridObj.saveState) {
				data.group = !!gridObj.group;
				GRIDS.get(gridObj.id).gridState = data;
			}
        },
        stateSaveParams: function (settings, data) {
            data.search.search = "";
        },
        stateLoadCallback: function (settings, callback) {
			if(!gridObj.saveState)
				callback("");
			if(gridObj.gridState) {
				if(gridObj.gridState.time) {
					callback(gridObj.gridState);
				}else{
					callback("");
				}
			}else{
				callback("");
			}
        }
	}

	if(gridObj.multiSelect) {
		gridTableInit.select = {
            style: 'multi+shift',
            items: 'row',
            info: false,
            selector: 'tr td div.gridSelectedRowIcon input'
        }
	}

	$("#" + gridObj.id).DataTable(gridTableInit);
	toggleAssociatedGridButtons(gridObj);
    applyCollapsableHeader(gridObj);


    var gridTable = $("#" + gridObj.id).DataTable();
    // init custom plugins
    new $.fn.dataTable.ColReorder(gridTable);
    new RowSelect(gridTable, gridObj);


	gridTable.on("xhr.dt", function ( e, settings, json, xhr ) {
        gridHandleJsonResults(json, gridObj);
    });

    gridTable.on('init.dt', function() {
        if (gridObj.gridState && (gridTable.page.info().pages - 1 < gridObj.gridState.page)) {
               gridTable.page('first').draw('page');
        }
    });
}

function applyCollapsableHeader(gridObj) {
    if (!$("#" + gridObj.id + "-collapsable-container").length) {
        $("#" + gridObj.id + "-collapsable-header").prepend(getCollapsableHeader(gridObj));
    }
}

const RowSelect = function (dt, opts) {
    if (!opts.multiSelect) return;

    const dtApi = new $.fn.dataTable.Api(dt);
    const settings = dtApi.settings()[0];
    const gridConfig = opts;

    // Ensure that we can't initialise on the same table twice
    if (settings._avadaRowSelect) {
        return settings._avadaRowSelect;
    }

    // default settings
    this.s = {
        dt: settings,
        dtApi: dtApi,
        dtConf: gridConfig
    };

    $.extend(RowSelect.prototype, {
        _fnRemoveSelections: function () {
            this._fnRemoveSelectionAll();
            this._fnRemoveSelectionPage();
        },

        _fnRemoveSelectionAll: function () {
            this.allSelectNode.prop('checked', false);
            this._setRequestSelectionMode('NONE');
        },

        _fnRemoveSelectionPage: function () {
            this.pageSelectNode.prop('checked', false);
            this._setRequestSelectionMode('NONE');
        },

        _fnConstruct: function () {
            this._fnApplySelectCheckboxes();
            this._fnApplySelectRowListeners();
            this._fnApplyNavigationListeners();
        },

        _selectPageRows: function () {
            const nodesToSelect = this.s.dtApi.rows({page: 'current'});
            nodesToSelect.select();

            this._displaySelectedCount(nodesToSelect.data().length);
            this._setRequestSelectionMode('PAGE');
        },

        _unSelectPageRows: function () {
            this.s.dtApi.rows({page: 'current'}).deselect();
            this._setRequestSelectionMode('NONE');
        },

        _selectAllRows: function () {
            const nodesToSelect = this.s.dtApi.rows({search: 'applied'});
            nodesToSelect.select();
            let totalRows = this.s.dtConf.serverSide ? (dt.ajax.json().recordsFiltered || dt.ajax.json().recordsTotal) : nodesToSelect.data().length;
            this._displaySelectedCount(totalRows);
            this._setRequestSelectionMode('ALL');
        },

        _unSelectAllRows: function () {
            this.s.dtApi.rows().deselect();
            this._setRequestSelectionMode('NONE');
        },

        _setRequestSelectionMode: function (mode) {
            this.s.dtConf.selectionMode = mode;
        },

        _getRequestSelectionMode: function () {
            return this.s.dtConf.selectionMode;
        },

        _displaySelectedCount: function (count) {
            this.messageNode
                .text(count + " rows selected")
                .css("display", "block")
                .fadeOut(2000)
                .delay(500);
        },

        _fnApplyNavigationListeners: function () {
            const that = this;
            this.s.dtApi.on('page.dt length.dt search.dt order.dt', function (e, dt) {
                if (dt._avadaRowSelect && dt._avadaRowSelect._getRequestSelectionMode() == 'PAGE') {
                    dt._avadaRowSelect._fnRemoveSelectionPage();
                }
            });

            this.s.dtApi.on('draw', function (e, dt) {
                if (dt._avadaRowSelect && dt._avadaRowSelect._getRequestSelectionMode() == 'ALL') {
                    that.s.dtApi.rows({search: 'applied'}).select();
                }
            });
        },

        _fnApplySelectRowListeners: function () {
            const that = this;
            this.s.dtApi.on('select', function (e, dt, type, indexes) {
                dt.rows(indexes).nodes().to$().find("td.gridSelectorColumn div.gridSelectedRowIcon input").prop("checked", true);
            });

            this.s.dtApi.on('deselect', function (e, dt, type, indexes) {
                dt.rows(indexes).nodes().to$().find("td.gridSelectorColumn div.gridSelectedRowIcon input").prop("checked", false);
                that._fnRemoveSelections();
            });
        },

        _fnApplySelectCheckboxes: function () {
            const selectorHeaderCell = $(this.s.dt.nTHead).find('tr th.gridSelectorColumn');
            const gridMessageDiv = $('#' + this.s.dtConf.id + '_gridRowsSelectedDiv');
            const pageSelectNode = $(SELECTOR_ICON_CODE);
            const allSelectNode = $(SELECTOR_ICON_CODE);

            // apply listeners
            const that = this;
            pageSelectNode.on('click keyup', function () {
                if (this.checked) {
                    that._selectPageRows();
                    that.allSelectNode.prop('checked', false);
                } else {
                    that._unSelectPageRows();
                }
            });

            allSelectNode.on('click keyup', function () {
                if (this.checked) {
                    that._selectAllRows();
                    that.pageSelectNode.prop('checked', false);
                } else {
                    that._unSelectAllRows();
                }
            });
selectorHeaderCell.empty();
            selectorHeaderCell.append(
                $('<div class="gridSelectPageHeaderIcon"><span>Page</span></div>').prepend(pageSelectNode),
                $('<div class="gridSelectAllHeaderIcon"><span>ALL</span></div>').prepend(allSelectNode)
            );
            this.pageSelectNode = pageSelectNode;
            this.allSelectNode = allSelectNode;
            this.messageNode = gridMessageDiv;
        }
    });
    this._fnConstruct();
    this.s.dt._avadaRowSelect = this;
    return this;
}

function getCollapsableHeader(gridObj) {
    return '<div id="'+gridObj.id+'-collapsable-container" class="gridCaption collapsable">\n' +
        '    <div id="'+gridObj.id+'-header" class="collapsable-header-main">\n' +
        '        <span class="collapsed-button" \n' +
        '            onclick="$(\'#' + gridObj.id + '-header-short\').removeClass(\'collapsed\');$(\'#' + gridObj.id + '-header\').addClass(\'collapsed\');$(\'#' + gridObj.id + '-collapsable-block > div\').addClass(\'collapsed\');">&#x25B2;</span>\n' +
        '        <span>' + gridObj.caption + '</span>\n' +
        '    </div>\n' +
        '    <div id="'+gridObj.id+'-header-short" class="collapsable-header-short collapsed">\n' +
        '        <span class="collapsed-button" \n' +
        '              onclick="$(\'#' + gridObj.id + '-header-short\').addClass(\'collapsed\');$(\'#'+ gridObj.id +'-header\').removeClass(\'collapsed\');$(\'#' + gridObj.id + '-collapsable-block > div\').removeClass(\'collapsed\');">&#x25BC;</span>\n' +
        '        <span>' + gridObj.caption + '</span>\n' +
        '    </div>\n' +
        '</div>';
}

function toggleAssociatedGridButtons(gridObj) {
	var numRecs = $('#' + gridObj.id).DataTable().page.info().length;
	//if (gridObj.toggleButtonDisplay) {
		if (numRecs > 0) {
			$('#' + gridObj.id + 'Buttons').css('display', 'block');
		} else {
			$('#' + gridObj.id + 'Buttons').css('display', 'none');
		}
	//}
}

function groupingProcess(gridObj) {
	if(gridObj.group) {
		//we must use a mutation observer here to wait for the group grid elements to load so we can add collapse/expand ability
		var observerTarget = document.querySelector("#" + gridObj.id + " tbody");
		var observerConfig = { attributes: false, childList: true, characterData: false }
		var observer = new MutationObserver(function(mutations) {

		    //start off all expanded or all collapsed
		    if(gridObj.groupCollapse) {
				$("#" + gridObj.id + " tr.dtrg-group").addClass("gridGroupHeaderCollapsed");
				$("#" + gridObj.id + " tr.odd").hide();
				$("#" + gridObj.id + " tr.even").hide();
			}else{
				$("#" + gridObj.id + " tr.dtrg-group").addClass("gridGroupHeaderExpanded");
				$("#" + gridObj.id + " tr.odd").show();
				$("#" + gridObj.id + " tr.even").show();
			}
			
			$("#" + gridObj.id + " tr.dtrg-group").each(function() {
				var groupRowText = $(this).find("th").text();
				var groupHeaderStateMap = GRIDS.get(gridObj.id).groupHeaderStateMap;
				if(groupHeaderStateMap && groupHeaderStateMap.has(groupRowText)) {
					var stateGroupHeaderClass = groupHeaderStateMap.get(groupRowText)
					$(this).removeClass("gridGroupHeaderCollapsed").removeClass("gridGroupHeaderExpanded").addClass(stateGroupHeaderClass);
					if(stateGroupHeaderClass == "gridGroupHeaderCollapsed") {
						$(this).nextUntil("tr.dtrg-group").hide();
					}
					if(stateGroupHeaderClass == "gridGroupHeaderExpanded") {
						$(this).nextUntil("tr.dtrg-group").show();
					}
				}
			});
			
			$("#" + gridObj.id + " tr.dtrg-group").on("click", function() {
				var groupRowText = $(this).find("th").text();
				$(this).nextUntil("tr.dtrg-group").toggle();
				var groupHeaderStateMap = GRIDS.get(gridObj.id).groupHeaderStateMap;
				if ($(this).hasClass("gridGroupHeaderCollapsed")) {
			    	$(this).removeClass("gridGroupHeaderCollapsed").addClass("gridGroupHeaderExpanded");
			    	groupHeaderStateMap.set(groupRowText, "gridGroupHeaderExpanded");
			    } else {
			      	$(this).removeClass("gridGroupHeaderExpanded").addClass("gridGroupHeaderCollapsed");
			      	groupHeaderStateMap.set(groupRowText, "gridGroupHeaderCollapsed");
			    }
			    GRIDS.get(gridObj.id).groupHeaderStateMap = groupHeaderStateMap;
			});
			
			this.disconnect();
		});

		observer.observe(observerTarget, observerConfig);
	}
}


//******************************************************************************************************************************
//GRID STATE *******************************************************************************************************************
//******************************************************************************************************************************
function saveGridState() {
	if(GRIDS == null || GRIDS.size < 1)
		return;
	var gridStateMap = new Map();
	for (const [gridId, gridObj] of GRIDS.entries()) {
		if(gridObj.saveState)
			gridStateMap.set(gridId, gridObj.gridState);
	}
	if(gridStateMap.size > 0) {
		$.ajax({
			url: HEADER_saveGridStateToUserSessionUrl,
			dataType: 'text',
			contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
			cache: false,
			async: true,
			timeout: 10000,
			global: false,
			data: {gridsStateJson: JSON.stringify(Object.fromEntries(gridStateMap)), pageURI: PAGE_URI},
			error: function(jqXHR, textStatus, errorThrown) {
				console.error(textStatus + ': ' + errorThrown);
			},
		});
	}
}

function resetGridState() {
	var _gridId = $('#gridStateModal_gridId').val();
	$.ajax({
		url: HEADER_resetGridStateInUserSessionUrl,
		dataType: 'json',
		contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
		cache: false,
		global: false,
		data: { pageURI: PAGE_URI, gridId: _gridId },
		complete: function() {
			closeGridStateModal();
			//TODO: cannot seem to find a way to force table to reload/redraw that actually WORKS. 
			//Don't want to relaod page, especially with multiple grids like find screens. 
			//But, will have to do it for now until I can really dig into this and get on the forums. 
			//Nothing in the API I have tried works. In fact, reloading the page is what they have an example to clear state. 
			GRIDS.get(_gridId).gridState={}; 
			window.location.reload();		
		}
	});		
}

function showGridStateModal(gridId) {
	$('#gridStateModal_gridId').val(gridId);
	$('#gridStateModal').modal('show');
}

function closeGridStateModal() {
	$('#gridStateModal').modal('hide');
}

//**************************************************************************************************************************************************

//**************************************************************************************************************************************************
// MESSAGE HANDLING 
//**************************************************************************************************************************************************

function gridHandleJsonResults(data, gridObj) {
	if(!gridObj.id) 
		gridObj = GRIDS.get(gridObj);

	var output = '';
	var messageObj = null;
	if (data != null) {
		if (data.resultsJson != null) 
			messageObj = data.resultsJson;
		else 
			messageObj = data;
	} else {
		return;
	}

	var errorOutput = "";
	var warningOutput = "";
	var successOutput = "";
	var otherOutput = "";
	var messageCount = 0;
	for (i in messageObj.messages) {
		messageCount++;
		if(messageObj.messages[i].messageType == '0'){
			successOutput += createGridMessageAlert(messageObj.messages[i], gridObj);	
		}
		else
		if(messageObj.messages[i].messageType == '1'){
			warningOutput += createGridMessageAlert(messageObj.messages[i], gridObj);	
		}
		else
		if(messageObj.messages[i].messageType == '-1'){
			errorOutput += createGridMessageAlert(messageObj.messages[i], gridObj);	
		}
		else
			otherOutput += createGridMessageAlert(messageObj.messages[i], gridObj);
	}
	
	output = errorOutput + warningOutput + otherOutput + successOutput;

	if (output.length > 0) {
		if(!gridObj.caption) {
			gridObj.caption = "";
		}
		
		let gridTablePosition = $('#' + gridObj.id + '_wrapper').offset();
				
		$('#' + gridObj.id + 'MessagesWrapper .gridMessagesHeader .gridMessagesHeaderText .gridMessagesHeaderCaptionText').text(gridObj.caption);
		$('#' + gridObj.id + 'MessagesWrapper .gridMessagesHeader .gridMessagesHeaderText .gridMessagesHeaderStaticText .gridMessagesHeaderCountText').text(messageCount);			
		$('#' + gridObj.id + 'MessagesWrapper').find(".gridMessages").empty();
		$('#' + gridObj.id + 'MessagesWrapper').css("top", (gridTablePosition.top + 10) + "px");
		$('#' + gridObj.id + 'MessagesWrapper').css("left", (gridTablePosition.left + 10) + "px");
		$('#' + gridObj.id + 'MessagesWrapper').css("max-height", $('#' + gridObj.id + '_wrapper').height() + "px");
        $('#' + gridObj.id + 'MessagesWrapper').css("min-height", "10%");
		$('#' + gridObj.id + 'MessagesWrapper').css("visibility","visible");
		
		$('#' + gridObj.id + 'Messages').append(output);
	}
}

function createGridMessageAlert(messageObj, gridObj) {
	var output = '';
	var additionalInfoHTML = '';
	
	var messageDetail = messageObj.messageDetail;
	
	if (messageDetail) {
		additionalInfoHTML = '<div class="message-detail" style="display:none">' + messageDetail + '</div>';
	}

	var div1 = '<div class="alert {0}">' + messageObj.message + '<span style="margin-right: 5px;">' + additionalInfoHTML + '</span>' + '</div>';

	if (messageObj.messageType == '0') {
		output = div1.replace("{0}", "alert-success");
	}
	else
	if (messageObj.messageType == '-1') {
		output = div1.replace("{0}", "alert-danger");

	}
	else
	if (messageObj.messageType == '1') {
		output = div1.replace("{0}", "alert-warning");
	}
	else
	{
		output = div1.replace("{0}", "alert-info");

	}

	if (messageObj.messageType == null) {
		output = div1.replace("{0}", "alert-info");
	}

	return output;
}

function togglePortletGridAlert(gridId) {
	$('#' + gridId + 'Messages').toggle('slide');
}

//**************************************************************************************************************************************************


function showGridPortletModal(gridId) {
	var gridObj = GRIDS.get(gridId);
	$('#gridPortletSaveMessage').html('');
	$('#saveGridAsPortletId').val(gridId);
	$('#gridPortletSaveName').val(gridObj.portletName);
	$('#gridPortletSaveModal_okButton').css('display', 'none');
	$('#gridPortletSaveModal_saveButton').css('display', 'inline');
	$('#gridPortletSaveModal_cancelButton').css('display', 'inline');
	$('#gridPortletSaveModal').modal('show');
}

function saveAsJSONPortlet() {
	var gridId = $('#saveGridAsPortletId').val();
	//var grid = JSON.parse(JSON.stringify(getGridFromArray(gridId))); //we do this to get a copy and NOT a bound reference!!
	var grid = JSON.parse(JSON.stringify(GRIDS.get(gridId))); //we do this to get a copy and NOT a bound reference!!
	
	grid.colModel = grid.colModelKey;
	grid.namespace = HEADER_namespace.substring(1) + '/';
	grid.isPortlet = true;
	grid.disableCreatePortlet = true;
	
	delete grid.gridState; //we do not want the same state for a Portlet which could have a different state.
	delete grid.groupHeaderStateMap;
	delete grid.ordering;
    delete grid.order;

	grid.portletName = $('#gridPortletSaveName').val();
 
	$.ajax({
		url: HEADER_saveGridTableAsPortletUrl,
		method: 'POST',
		dataType: 'json',
		contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
		cache: false,
		global: false,
		data: { jsonObject: JSON.stringify(grid) },
		complete: function(data) {
			// Display any error or information information in regards to the Grid loading
			data.resultsJson = data.responseJSON;

			$('#gridPortletSaveMessage').html('');
			var output = '';
			if (data != null && data.resultsJson != null) {
				var messageObj = data.resultsJson;

				for (i in messageObj.messages) {
					if (messageObj.messages[i].messageType == '0') {
						output += '<div class="alert alert-success alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><span class="glyphicon glyphicon-ok-sign" aria-hidden="true"></span>' +
							messageObj.messages[i].message +
							'</div>';
							$('#gridPortletSaveModal_okButton').css('display', 'inline');
							$('#gridPortletSaveModal_saveButton').css('display', 'none');
							$('#gridPortletSaveModal_cancelButton').css('display', 'none');
					} else if (messageObj.messages[i].messageType == '-1') {
						output +=
							'<div class="alert alert-danger alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>' +
							messageObj.messages[i].message +
							'</div>';
					} else if (messageObj.messages[i].messageType == '1') {
						output += '<div class="alert alert-warning alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>' +
							messageObj.messages[i].message +
							'</div>';
					} else if ( messageObj.messages[i].messageType == '2' || 	messageObj.messages[i].messageType == '3') {
						output += '<div class="alert alert-info alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span>' +
							messageObj.messages[i].message +
							'</div>';
					} else {
						output += '<div class="alert alert-info alert-dismissible" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span>' +
							messageObj.messages[i].message +
						'	</div>';
					}
				}
				$('#gridPortletSaveMessage').html(output);
			}
		},
	});
}

$.fn.scrollTo = function(elem) {
	var parentScrollTop = $(this).scrollTop();
	var parentTop = $(this).offset().top;
	if ($(elem).length == 0) 
		return false;
	var elementTop = $(elem).offset().top;
	$(this).animate({
		scrollTop: parentScrollTop - parentTop + elementTop,
	}, 10);

	return true;
};


//*************************************************************************************************************************
//** FORMATTERS 
//*************************************************************************************************************************

function formatLinkMonitor(cellvalue, type, rowObject, options) {
	if (rowObject.monitorIndicator == 'Y')
		return '<span class="not-monitored">not monitored</span>';
	else 
	if (rowObject.monitorIndicator == 'G')
		return '<span class="monitored">monitored, no errors</span>';
	else
	if (rowObject.monitorIndicator == 'R')
		return '<span class="errors">monitored, errors</span>';
    else
    if (rowObject.monitorIndicator == 'O')
        return '<span class="issue-monitored">monitoring starting</span>';
	else
		return '<span class="not-monitored">not monitored</span>';
}

function formatLinkTrend(cellvalue, type, rowObject, options) {
	if (rowObject.trendIndicator == 'Y')
		return '<span class="not-monitored">not monitored</span>';
	else 
	if (rowObject.trendIndicator == 'G')
		return '<span class="monitored">monitored, no errors</span>';
	else
	if (rowObject.trendIndicator == 'R')
		return '<span class="errors">monitored, errors</span>';
    else
    if (rowObject.trendIndicator == 'O')
        return '<span class="issue-monitored">monitoring starting</span>';
	else
		return '<span class="not-monitored">not monitored</span>';
}

function formatMonitorIndicator(cellvalue, type, rowObject, options) {
	if (rowObject.monitor == false) {
		return '<span class="not-monitored">not monitored</span>';
	} else if (rowObject.monitor == true) {
		return '<span class="no-errors">monitored, no errors</span>';
	} else {
		return '<span class="errors">monitored, errors</span>';
	}
}

function formatTrendIndicator(cellvalue, type, rowObject, options) {
	if (rowObject.trend == false) {
		return '<span class="not-monitored">not monitored</span>';
	} else if (rowObject.trend == true) {
		return '<span class="no-errors">monitored, no errors</span>';
	} else {
		return '<span class="errors">monitored, errors</span>';
	}
}

function formatStateIndicator(cellvalue, type, rowObject, options) {
	if (rowObject.state == false) {
		return '<span class="not-monitored">not monitored</span>';
	} else if (rowObject.state == true) {
		return '<span class="no-errors">monitored, no errors</span>';
	} else {
		return '<span class="errors">monitored, errors</span>';
	}
}

function formatLinkView(cellvalue, type, rowObject, options) {
	// Do not use 'javascript:location.href' encoding URL does not work..
	//var url = "javascript:location.href=\"" + rowObject.viewUrl + "\"";
	return "<a href='" + rowObject.viewUrl + "'>" + cellvalue + '</a>';
}

function formatLinkUserId(cellvalue, type, rowObject, options) {
	if (rowObject.userIdUrl != '#') {
		url = 'javascript:location.href="' + gridFormatterUrl(rowObject.userIdUrl, options) + '"';
		return "<a href='" + url + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function formatLinkTrendObject(cellvalue, type, rowObject, options) {
	if (rowObject.trendObjectCountUrl != '#') {
		url = 'javascript:location.href="' + gridFormatterUrl(rowObject.trendObjectCountUrl, options) + '"';
		return "<a href='" + url + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function buildLinkFormatter(config) {
    return function (cellValue, type, rowObject, options) {
        const rawValue = config.urlBuilder ? config.urlBuilder(cellValue, type, rowObject, options) : rowObject[config.fieldName];
        if (rawValue != undefined && rawValue != null && (rawValue != '#')) {
            return "<a href='" + gridFormatterUrl(rawValue, options) + (config.urlPostfix || '') + "'>" + (config.staticLabel || cellValue) + '</a>';
        }
        return cellValue;
    }
}


function formatLinkName(cellvalue, type, rowObject, options) {
	if (rowObject.nameUrl != '#') {
		// Do not use 'javascript:location.href' encoding URL does not work..
		//url = "javascript:location.href=\"" + rowObject.nameUrl + "\"";
		return "<a href='" + gridFormatterUrl(rowObject.nameUrl, options) + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function formatLinkQueue(cellvalue, type, rowObject, options) {
    if (rowObject.queueUrl != "#")	{
        // Do not use 'javascript:location.href' encoding URL does not work..
        //url = "javascript:location.href=\"" + rowObject.queueUrl + "\"";
        return "<a href='" + gridFormatterUrl(rowObject.queueUrl, options) + "'>" + cellvalue + "</a>";
    }
    else
        return cellvalue;
}

function formatLinkNameTear(cellvalue, type, rowObject, options) {
	if (rowObject.nameUrl != '#') {
		// Do not use 'javascript:location.href' encoding URL does not work..
		//url = "javascript:location.href=\"" + rowObject.nameUrl + "\"";
		return "<a target='_blank' href='" + gridFormatterUrl(rowObject.nameUrl, options) + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function formatLinkChannelName(cellvalue, type, rowObject, options) {
	return formatLinkName(cellvalue, type, rowObject, options);
}

function formatLinkLabel(cellvalue, type, rowObject, options) {
	if (rowObject.nameUrl != '#') {
		// Do not use 'javascript:location.href' encoding URL does not work..
		//url = "javascript:location.href=\"" + rowObject.nameUrl + "\"";
		return "<a href='" + rowObject.nameUrl + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function formatFileExplorerLinkName(cellvalue, type, rowObject, options) {
	var url;
	var directory = rowObject.directory.replace(/(\\)/g, '\\\\');

	if (rowObject.fileType == "D") {
		url = "<a href='#' onclick='gridReload(\"" + directory + "\", \"" + rowObject.fileType + "\")'>" + cellvalue + "</a>";
	}
	else if (rowObject.fileType == "L") {
		var urlValue = "javascript:location.href=\"host-file-explorer!show?" + 
			"guid=" + $("#guid").val() + 
			"&directory=" + encodeURIComponent(directory) +
			"&file=" + rowObject.file + 
			"&parentAccess=" + rowObject.parentAccess + 
			"&link=" + rowObject.link + 
			"&fileSize=" + rowObject.size + 
			"&fileType=" + rowObject.fileType + "\"";
		url = "<a href='" + urlValue + "'>" + cellvalue + "</a>";
	}
	else
	{
		var encodedDir = encodeURIComponent(rowObject.directory);
		var urlValue = "host-file-modify!show?" + "guid=" + $("#guid").val() + "&directory=" + encodedDir + "&file=" + rowObject.file + "&parentAccess=" + rowObject.parentAccess + "&fileSize=" + rowObject.size;
		url = "<a href='" + urlValue + "'>" + cellvalue + "</a>";
	}
	
	return url;
}

function fileSizeFormatter(cellValue, options, rowObject){
	return rowObject.fileType == "F" ? rowObject.size : '';
}

function fixHeightOfFrozenDivs(colsElements) {
	var $rows = $(colsElements.cssSelect, colsElements.normalDivs);

	$(colsElements.cssSelect, colsElements.fixedDivs).each(function(i) {
		var rowHeight = $($rows[i]).height();
		var rowHeightFrozen;

		$(this).height(rowHeight);
		rowHeightFrozen = $(this).height();

		if (rowHeight !== rowHeightFrozen) {
			$(this).height(rowHeight + (rowHeight - rowHeightFrozen));
		}
	});

	$(colsElements.fixedDivs).height(colsElements.normalDivs.clientHeight);
	$(colsElements.fixedDivs).css($(colsElements.normalDivs).position());
}

function setHeightOfFixedCols() {
	var colsElements = setFixedColsParams(this);

	fixHeightOfFrozenDivs.call(this, colsElements.body);
	fixHeightOfFrozenDivs.call(this, colsElements.head);
}

function setFixedColsParams(current) {	
	return {
		body: {
			normalDivs: current.grid.bDiv,
			fixedDivs: current.grid.fbDiv,
			cssSelect: '.ui-jqgrid-btable tbody tr:not(.jqgfirstrow)',
		},
		head: {
			normalDivs: current.grid.hDiv,
			fixedDivs: current.grid.fhDiv,
			cssSelect: '.ui-jqgrid-htable thead tr',
		},
	};	
}

function setCheckboxColWidth(gridId, width) {
	$('#' + gridId).jqGrid('setColWidth', 'cb', width);
}

function addLabelToHeaderCheckbox(gridId) {
	if (!$('.cb_label').length) {
		$('<label class="cb_label"></label>').appendTo(
				'th.jqgh_cbox #jqgh_' + gridId + '_cb'
		);
	}
}

function formatLinkMultipleHost(cellvalue, type, rowObject, options) {
	var hostArr = cellvalue.split(',');

	if (cellvalue.indexOf(',') > -1) {
		var newCellValue = '';

		for (var x = 0; x < hostArr.length; x++) {
			if (hostArr[x] == rowObject.activeHost && rowObject.monitorIndicator != 'R')
				newCellValue += "<span style='color:orange;font-weight:bold'>" +  hostArr[x] + '</span>,';
			else 
				newCellValue += hostArr[x] + ',';
		}

		// Get rid of dangling ',' if it exists
		if (newCellValue[newCellValue.length - 1] == ',')
			newCellValue = newCellValue.substring(0, newCellValue.length - 1);

		return newCellValue;
	} 
	else 
		return cellvalue;
}

function formatLinkBaseQueueNameUrl(cellvalue, type, rowObject, options) {
	if (cellvalue.length < 1) {
		return "<span style='text-align:left;background-color:red;'>         </span>";
	} 
	else 
		if (rowObject.baseQueueNameUrl != '#') {
			// Do not use 'javascript:location.href' encoding URL does not work..
			//url = "javascript:location.href=\"" + rowObject.baseQueueNameUrl + "\"";
			return "<a href='" + gridFormatterUrl(rowObject.baseQueueNameUrl, options) + "'>" + cellvalue + '</a>';
		} 
		else 
			return cellvalue;
}

function formatLinkTarget(cellvalue, type, rowObject, options) {
	if (rowObject.targetUrl != '#') {
		// Do not use 'javascript:location.href' encoding URL does not work..
		//url = "javascript:location.href=\"" + rowObject.baseQueueNameUrl + "\"";
		return "<a href='" + gridFormatterUrl(rowObject.targetUrl, options) + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function formatLinkQmgrName(cellvalue, type, rowObject, options) {
	if (rowObject.queueManagerUrl != '#') {
		url = 'javascript:location.href="' + gridFormatterUrl(rowObject.queueManagerUrl, options) + '"';
		return "<a href='" + url + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function formatLinkConnectionName(cellvalue, type, rowObject, options) {
	if (rowObject.queueManagerUrl != '#') {
		url = 'javascript:location.href="' +  gridFormatterUrl(rowObject.connectionUrl, options) + '"';
		return "<a href='" + url + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function formatLinkAlertName(cellvalue, type, rowObject, options) {
	if (rowObject.alertUrl != '#') {
		url = 'javascript:location.href="' +gridFormatterUrl(rowObject.alertUrl, options) + '"';
		return "<a href='" + url + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function formatRemoteQmgrName(cellvalue, type, rowObject, options) {
	if (cellvalue.length < 1) {
		return "<span style='text-align:left;background-color:red;'>         </span>";
	}

	return cellvalue;
}

function formatLinkConnName(cellvalue, type, rowObject, options) {
	if (rowObject.connectionUrl != '#') {
		url = 'javascript:location.href="' + gridFormatterUrl(rowObject.connectionUrl, options) + '"';
		return "<a href='" + url + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function formatLinkSourceNode(cellvalue, type, rowObject, options) {
	if (rowObject.sourceNodeUrl != '#') {
		url = 'javascript:location.href="' +  gridFormatterUrl(rowObject.sourceNodeUrl, options) + '"';
		return "<a href='" + url + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function formatLinkTargetNode(cellvalue, type, rowObject, options) {
	if (rowObject.targetNodeUrl != '#') {
		url = 'javascript:location.href="' + gridFormatterUrl(rowObject.targetNodeUrl, options) + '"';
		return "<a href='" + url + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function formatLinkDepth(cellvalue, type, rowObject, options) {
	if (rowObject.depthUrl != '#') {
		// Do not use 'javascript:location.href' encoding URL does not work..
		//url = "javascript:location.href=\"" + rowObject.depthUrl + "\"";
		return "<a href='" + gridFormatterUrl(rowObject.depthUrl, options) + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function formatLinkXmitQueueName(cellvalue, type, rowObject, options) {
	if (rowObject.xmitQueueNameUrl != '#') {
		if (cellvalue.length < 1) {
			return "<span style='text-align:left;background-color:red;'>         </span>";
		} 
		else 
		{
			// Do not use 'javascript:location.href' encoding URL does not work..
			//url = "javascript:location.href=\"" + rowObject.xmitQueueNameUrl + "\"";
			return "<a href='" + gridFormatterUrl(rowObject.xmitQueueNameUrl, options) + "'>" + cellvalue + '</a>';
		}
	} 
	else 
	{
		if (cellvalue.length < 1) {
			return "<span style='text-align:left;background-color:red;'>         </span>";
		} 
		else 
			return cellvalue;
	}
}

function formatLinkClusterChannel(cellvalue, type, rowObject, options) {
	if (rowObject.nameUrl != '#') {
		url = 'javascript:location.href="' + gridFormatterUrl(rowObject.nameUrl, options) + '"';
		return "<a href='" + url + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function formatLinkClusterQmgrNameUrl(cellvalue, type, rowObject, options) {
	if (rowObject.clusterQmgrNameUrl != '#') {
		url =  'javascript:location.href="' +  gridFormatterUrl(rowObject.clusterQmgrNameUrl, options) + '"';
		return "<a href='" + url + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function formatLinkClusterNameUrl(cellvalue, type, rowObject, options) {
	if (rowObject.clusterNameUrl != '#') {
		url = 'javascript:location.href="' +  gridFormatterUrl(rowObject.clusterNameUrl, options) +  '"';
		return "<a href='" + url + "'>" + cellvalue + '</a>';
	} 
	else 
		return cellvalue;
}

function formatStatus(cellvalue, type, rowObject, options) {
	var item = cellvalue.toLowerCase();

	if (item == 'true' ||
			item == 'disabled' ||
			item == 'stopped' ||
			item == 'stopping' ||
			item == 'retrying' ||
			item == 'retry' ||
			item == 'standby'
	) 
	{
		return "<span style='text-align:left;color:red'>" + cellvalue + '</span>';
	} 
	else 
		if (item == 'inactive' || item == 'initializing') {
			return "<span style='text-align:left;color:orange'>" + cellvalue + '</span>';
		} 
		else 
			if (item == 'started' || item == 'running') {
				return "<span style='text-align:left;color:green'>" + cellvalue + '</span>';
			}

	return cellvalue;
}

function formatBlank(cellvalue, type, rowObject, options) {
	var item = cellvalue.toLowerCase();

	if (item.length < 1) {
		return "<span style='text-align:left;background-color:red;'>" + cellvalue + '</span>';
	}

	return cellvalue;
}

function formatTrueFalse(cellvalue, type, rowObject, options) {
	if (cellvalue == false) {
		return "<span style='text-align:left;color:red;'>" + cellvalue + '</span>';
	}

	return cellvalue;
}

function formatTrueFalse2(cellvalue, type, rowObject, options) {
	if (cellvalue == false) {
		return "<span style='text-align:left;color:red;'>" + cellvalue + '</span>';
	} 
	else
		return "<span style='text-align:left;color:green;'>" + cellvalue + '</span>';

	return cellvalue;
}

function formatTrueFalseRed(cellvalue, type, rowObject, options) {
	if (cellvalue == true) {
		return "<span style='text-align:left;color:red;'>" + cellvalue + '</span>';
	}

	return cellvalue;
}

function formatTrueFalseGreen(cellvalue, type, rowObject, options) {
	if (cellvalue == true) {
		return "<span style='text-align:left;color:green;'>" + cellvalue + '</span>';
	}

	return cellvalue;
}

function formatTrueFalseGreenString(cellvalue, type, rowObject, options) {
	var item = cellvalue.toLowerCase();

	if (item.indexOf('true') > -1) {
		return "<span style='text-align:left;color:green;'>" + cellvalue + '</span>';
	}

	return cellvalue;
}

function formatStatusBoolean(cellvalue, type, rowObject, options) {
	if (cellvalue == true) {
		return "<span style='text-align:left;color:red'>" + cellvalue + '</span>';
	}

	return cellvalue;
}

function formatStateText(cellvalue, type, rowObject, options) {
	if (
			rowObject.state == false ||
			rowObject.state.toLowerCase() == 'stopped' ||
			rowObject.state.toLowerCase() == 'stopping'
	) {
		return "<span style='text-align:left;color:red'>Stopped</span>";
	} else if (
			rowObject.state == true ||
			rowObject.state.toLowerCase() == 'running' ||
			rowObject.state.toLowerCase() == 'started' ||
			rowObject.state.toLowerCase() == 'starting'
	) {
		return "<span style='text-align:left;color:#00bb00'>Running</span>";
	} 
	else {
		return "<span style='text-align:left;color:purple'>" + cellvalue + '</span>';
	}
}

function formatLocalQueueDepth(cellvalue, type, rowObject, options) {
	if (rowObject.depthUrl != '#') {
		// Do not use 'javascript:location.href' encoding URL does not work..
		//url = "javascript:location.href=\"" + rowObject.depthUrl + "\"";
		if (rowObject.depth > rowObject.maxDepth * 0.8)
			return "<a href='" +  gridFormatterUrl(rowObject.depthUrl, options) + "' style='text-align:left;color:red'>" + cellvalue + '</a>';

		return "<a href='" + gridFormatterUrl(rowObject.depthUrl, options) + "'>" + cellvalue +'</a>';
	}

	return cellvalue;
}

function gridFormatterUrl(url, options) {
    const gridConfig = options.settings.oInit.ir360GridConfig;
    
    let result = url;
    if (gridConfig && gridConfig.isPortlet && gridConfig.namespace) {
        result = gridConfig.namespace + url;
    }
    return result;
}

function formatClick(cellvalue, type, rowObject, options) {
	return "<a style='cursor:pointer' onClick=" + rowObject.clickFunction + '>' + rowObject.clickFunctionLabel + '</a>';
}

function formatLinkAddress(cellvalue, type, rowObject, options) {
	const address = rowObject.address || '';
	if (address && rowObject.addressUrl != '#') {
		return (
			"<a href='" + gridFormatterUrl(rowObject.addressUrl, options) + "'>" + cellvalue + '</a>'
		);
	} else return address;
}

	function formatLinkAmqName(cellvalue, type, rowObject, options) {
	  if (rowObject.nameUrl != '#') {
	    return (
	      "<a href='" +
	      gridFormatterUrl(rowObject.nameUrl, options) +
	      "'>" +
	      cellvalue +
	      '</a>'
	    );
	  } else return cellvalue;
	}
	
	function formatLinkMessages(cellvalue, type, rowObject, options) {
		  if (rowObject.nameUrl != '#') {
		    return (
		      "<a href='" +
		      gridFormatterUrl(rowObject.nameUrl, options) +
		      "&tab=messages" +
		      "'>" +
		      cellvalue +
		      '</a>'
		    );
		  } else return cellvalue;
		}

	function formatLinkMessage(cellvalue, type, rowObject, options) {
		  if (rowObject.nameUrl != '#') {
		    return (
		      "<a href='" +
		      gridFormatterUrl(rowObject.nameUrl, options) +
		      "'>" +
		      cellvalue +
		      '</a>'
		    );
		  } else return cellvalue;
		}
	
		function formatLinkQueues(cellvalue, type, rowObject, options) {
		  if (rowObject.nameUrl != '#') {
		    return (
		      "<a href='" +
		      gridFormatterUrl(rowObject.nameUrl, options) +
		      "&tab=queues" +
		      "'>" +
		      cellvalue +
		      '</a>'
		    );
		  } else return cellvalue;
		}

		function formatLinkConsumer(cellvalue, type, rowObject, options) {
		  if (rowObject.nameUrl != '#') {
		    return (
		      "<a href='" +
		      gridFormatterUrl(rowObject.nameUrl, options) +
		      "&tab=consumers" +
		      "'>" +
		      cellvalue +
		      '</a>'
		    );
		  } else return cellvalue;
		}

function buttonActionFindUrl(gridId, url) {
	var ret;
	var arrayCount = 0;
	var guids = [];

	guids = GRID.getSelectedGuids(gridId);
	if (guids.length < 1) {
		alert('<s:property value="%{getText(\'global.noRowsSelected\')}"/>');
		return false;
	}

	// Start to show AJAX command is working
	$('#' + gridId + 'Indicator').toggle();

	$.ajax({
		url: encodeURIComponent(url),
		cache: false,
		dataType: 'json',
		contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
		global: false,
		timeout: ajaxTimeout,
		data: {
			guids: guids,
			gridId: gridId,
		},
		success: function(json) {
			GRID.refreshGrid(gridId, json);

			// Stop showing AJAX command is working
			$('#' + gridId + 'Indicator').toggle();
		},
	});

	return false;
}
