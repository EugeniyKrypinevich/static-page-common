(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['jquery', 'datatables.net'], function ($) {
            return factory($, window, document);
        });
    } else if (typeof exports === 'object') {
        // CommonJS
        module.exports = function (root, $) {
            if (!root) {
                root = window;
            }

            if (!$ || !$.fn.dataTable) {
                $ = require('datatables.net')(root, $).$;
            }

            return factory($, root, root.document);
        };
    } else {
        // Browser
        factory(jQuery, window, document);
    }
}(function ($, window, document, undefined) {
    'use strict';

    const AvadaSearch = function (dt, opts) {
        const dtApi = new $.fn.dataTable.Api(dt);
        const settings = dtApi.settings()[0];
        const gridConfig = settings.oInit.ir360GridConfig;

        if (gridConfig.disableFiltering) return;

        // Ensure that we can't initialise on the same table twice
        if (settings._avadaSearch) {
            return settings._avadaSearch;
        }

        // Allow the options to be a boolean for defaults
        if (opts === true) {
            opts = {};
        }

        this.s = {
            dt: settings,
            dtApi: dtApi,
            dtConf: gridConfig
        };

        // public access
        this.s.dt._avadaSearch = this;

        this._fnConstruct();
        return this;
    }

    $.fn.dataTable.AvadaSearch = AvadaSearch;

    $.extend(AvadaSearch.prototype, {
        // private methods
        _fnConstruct: function () {
            const columns = this.s.dt.aoColumns;
            const columnLength = columns.length;
            const gridConfig = this.s.dtConf;
            const gridState = gridConfig.gridState;

            const tfoot = this._fnConstructFooter();
            this.s.dt.nTHead.parentNode.append(tfoot);
            this.s.dt.nTSearch = tfoot;

            const searchRow = this._fnConstructSearchRow();
            const searchColumns = [];
            let columnConfig, cell, searchInput, i;

            for (i = 0; i < columnLength; i++) {
                columnConfig = columns[i];
                cell = this._fnConstructSearchCell(columnConfig);
                searchInput = null;

                if (columnConfig.bSearchable) {
                    searchInput = this._fnConstructSearchInput(columnConfig, gridState && gridState.columns && gridState.columns[i]);
                    cell.append(searchInput);
                }
                if (columnConfig.bVisible) {
                    searchRow.append(cell);
                }
                searchColumns[i] = {nSTh: cell, nSTi: searchInput, nTh: columnConfig};
            }

            this.s.dt._avadaSearch.nTr = searchRow;
            this.s.dt._avadaSearch.columns = searchColumns;
            tfoot.append(searchRow)
            this._fnApplySearchEventListeners();
            this._fnApplyVisibilityEventListeners();

            if (this.s.dtConf.serverSide) {
                this._fnApplyCleanSearchEventListeners();
            }
        },

        _fnCleanSearchState: function (oState) {
            if (oState && oState.columns) {
                oState.columns.forEach(function (el) {
                    el.search.search = '';
                });
            }
        },

        _fnBlockCleanFilters: function () {
            this.s.dtConf.skipCleanFilters = true;
        },

        _fnUnblockCleanFilters: function () {
            this.s.dtConf.skipCleanFilters = false;
        },

        _fnIsFiltersBlocked: function () {
            return this.s.dtConf.skipCleanFilters;
        },

        _fnUseCache: function () {
            this.s.dtConf.sendUseCacheFlag = true;
        },

        _fnIsGlobalSearch: function () {
            return !!(this.s.dt.oPreviousSearch && this.s.dt.oPreviousSearch.sSearch);
        },

        _fnApplyCleanSearchEventListeners: function () {
            const that = this;
            this.s.dtApi.on('length.dt page.dt', function () {
                if (that._fnIsGlobalSearch()) {
                    that._fnUseCache();
                } else {
                    that._fnClearFilters();
                }
            }).on('search.dt', function () {
                // there is no difference between column search event and main search event, so, we can check an active element
                // and be sure that we do not call search twice
                if (!that._fnIsFiltersBlocked()) {
                    if (document.activeElement.type == 'search') {
                        that._fnClearFilters();
                    } else if (document.activeElement.type == 'text') {
                        that._fnUseCache();
                    }
                }
            });

            that.s.dt.oApi._fnCallbackReg(this.s.dt, 'aoStateSaveParams', function (oS, oData) {
                that._fnCleanSearchState.call(that, oData);
            }, "AvadaCleanSearch_State");
        },

        _fnClearFilters: function () {
            this._fnBlockCleanFilters();
            this.s.dtApi.columns().search('');
            this.s.dt._avadaSearch.columns.forEach(function (el) {
                const jqEl = $(el.nSTi);
                if (jqEl.val()) {
                    jqEl.removeClass('inputX inputXHover').val('');
                }
            });
            this._fnUnblockCleanFilters();
        },

        _fnConstructFooter: function () {
            return document.createElement('tfoot');
        },

        _fnConstructSearchRow: function () {
            const row = document.createElement('tr');
            row.classList.add('avada-search-row');
            return row;
        },

        _fnConstructSearchCell: function () {
            return document.createElement('th');
        },

        _fnCleanSearchInput: function (inputNode) {
            $(inputNode).removeClass('inputX inputXHover').val('');
            $(inputNode).trigger("clear");
        },

        _fnConstructSearchInput: function (columnConfig, stateConfig) {
            const that = this;
            const input = document.createElement('input');
            input.classList.add('grid-filter-input');
            if (stateConfig && stateConfig.search && stateConfig.search.search) {
                input.value = stateConfig.search.search;
                input.classList.add('inputX');
            }
            input.setAttribute("type", "text");
            $(input).on('keyup clear', function () {
                that.s.dt._avadaRowSelect._unSelectAllRows()
                that.s.dtApi.column(columnConfig.idx)
                    .search(this.value)
                    .draw(false);
            });
            return input;
        },

        _fnApplyVisibilityEventListeners: function () {
            const that = this;
            this.s.dtApi.on('column-visibility.dt', function (event, settings, colId, state) {
                if (!state) {
                    that._fnCleanSearchInput(that.s.dt._avadaSearch.columns[colId].nSTi);
                    that.s.dt._avadaSearch.columns[colId].nSTh.remove();
                } else {
                    that.s.dt._avadaSearch.nTr.insertBefore(that.s.dt._avadaSearch.columns[colId].nSTh, that.s.dt._avadaSearch.nTr.childNodes[colId]);
                }
            });
            // This is 200ms placed here because fixedColumnPlugin adds fixing styles (an _addStyles method) after the table is drawn,
            // and we should wait till this operation is complete. Unfortunately, there is no event or callback.
            this.s.dtApi.on('draw', function () {
                setTimeout(function () {
                    that._fnApplyFixedStyles.call(that)
                }, 200);
            });
        },

        _fnApplyFixedStyles: function () {
            const searchRow = this.s.dt._avadaSearch.nTr;
            const headerRow = this.s.dt.nTHead.getElementsByTagName('tr')[0];
            if (searchRow && headerRow) {
                const headerColumns = headerRow.getElementsByTagName('th');
                const searchColumns = searchRow.getElementsByTagName('th');

                let headerColumn, searchColumn, i;
                for (i = 0; i < headerColumns.length; i++) {
                    headerColumn = headerColumns[i];
                    searchColumn = searchColumns[i];
                    if (headerColumn.className.includes("dtfc-fixed")) {
                        searchColumn.classList.add('avada-dtfc-fixed')
                        searchColumn.style.left = headerColumn.style.left;
                        searchColumn.style.right = headerColumn.style.right;
                    }
                }
            }
        },

        _fnApplySearchEventListeners: function () {
            const that = this;
            $(document).on('input', '.grid-filter-input', function () {
                $(this)[that._fnTog(this.value)]('inputX');
            }).on('mousemove', '.inputX', function (e) {
                $(this)[that._fnTog(this.offsetWidth - 18 < e.clientX - this.getBoundingClientRect().left)]('inputXHover');
            }).on('click', '.inputXHover', function () {
                that._fnCleanSearchInput(this);
            });
        },
        _fnTog: function (v) {
            return v ? 'addClass' : 'removeClass';
        }
    });

    // Expose
    $.fn.dataTable.AvadaSearch = AvadaSearch;

    // Register a new feature with DataTables
    if (typeof $.fn.dataTable == "function" &&
        typeof $.fn.dataTableExt.fnVersionCheck == "function" &&
        $.fn.dataTableExt.fnVersionCheck('1.10.8')) {
        $.fn.dataTableExt.aoFeatures.push({
            "fnInit": function (settings) {
                const table = settings.oInstance;
                let dtInit, opts;

                if (!settings._avadaSearch) {
                    dtInit = settings.oInit;
                    opts = dtInit._avadaSearch || {};

                    new AvadaSearch(settings, opts);
                } else {
                    table.oApi._fnLog(settings, 1, "AvadaSearch attempted to initialise twice. Ignoring second");
                }

                return null; /* No node for DataTables to insert */
            },
            "cFeature": "J",
            "sFeature": "AvadaSearch"
        });
    } else {
        alert("Warning: AvadaSearch requires DataTables 1.10.8 or greater - www.datatables.net/download");
    }
    return AvadaSearch;
}));
