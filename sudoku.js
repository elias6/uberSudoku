"use strict";

$(document).ready(function () {
    $(".sudokuContainer").uberSudoku();
});

(function ($, undefined) {
    function Plugin(element) {
        this.element = element;
        this.init();
    }

    var ALL_ROW_LABELS = ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
        ALL_COLUMN_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
        ALL_CELL_LABELS = _.flatten(
            ALL_ROW_LABELS.map(function (rowLabel) {
                return ALL_COLUMN_LABELS.map(function (columnLabel) {
                    return rowLabel + columnLabel;
                });
            })
        ),
        ROW_CELL_LABEL_HASH = _(ALL_CELL_LABELS).groupBy(function (cellLabel) {
            return cellLabel.charAt(0);
        }),
        COLUMN_CELL_LABEL_HASH = _(ALL_CELL_LABELS).groupBy(function (cellLabel) {
            return cellLabel.charAt(1);
        }),
        BOX_CELL_LABEL_HASH = _.object(ALL_CELL_LABELS.map(function (cellLabel) {
            var rowLabel = cellLabel.charAt(0),
                columnLabel = cellLabel.charAt(1),
                bandRowPos = 3 * Math.floor(ALL_ROW_LABELS.indexOf(rowLabel) / 3),
                bandRowLabels = ALL_ROW_LABELS.slice(bandRowPos, bandRowPos + 3),
                stackColumnPos = 3 * Math.floor(ALL_COLUMN_LABELS.indexOf(columnLabel) / 3),
                stackColumnLabels = ALL_COLUMN_LABELS.slice(stackColumnPos, stackColumnPos + 3),
                boxCellLabels = _.flatten(
                    _(bandRowLabels).map(function (bandRowLabel) {
                        return _(stackColumnLabels).map(function (stackColumnLabel) {
                            return bandRowLabel + stackColumnLabel;
                        });
                    })
                );
            return [cellLabel, boxCellLabels.sort()];
        })),
        ALL_BOX_CELL_LABELS = _.uniq(_.values(BOX_CELL_LABEL_HASH), JSON.stringify),
        PEER_CELL_LABEL_HASH = _.object(ALL_CELL_LABELS.map(function (cellLabel) {
            var peerLabels = _.union(
                    ROW_CELL_LABEL_HASH[cellLabel.charAt(0)],
                    COLUMN_CELL_LABEL_HASH[cellLabel.charAt(1)],
                    BOX_CELL_LABEL_HASH[cellLabel]);
            return [cellLabel, peerLabels.sort()];
        }));

    $.extend(Plugin.prototype, {
        init: function () {
            this.$grid = this.createGrid();

            this.$cells = this.$grid.find(".cell");

            this.populateGrid();
            this.attachEvents();
            $(this.element).append(this.$grid);
        },

        createGrid: function () {
            $(this.element).empty().addClass("uberSudoku");

            var $grid = $("<table class='grid' />");

            ALL_ROW_LABELS.forEach(function (rowLabel) {
                var $row = $("<tr />").appendTo($grid);
                ALL_COLUMN_LABELS.forEach(function (columnLabel) {
                    var $cell = $("<td />", {
                            "class": "cell",
                            "data-row-label": rowLabel,
                            "data-column-label": columnLabel,
                            "data-cell-label": rowLabel + columnLabel});
                    $cell.append("<input type='text' maxlength='5' pattern='[0-9]*' />");
                    $row.append($cell);
                });
            });

            return $grid;
        },

        getCell: function (cellLabel) {
            return this.getCells([cellLabel]);
        },

        getCells: function (cellLabels) {
            return this.$cells.filter(function (i, cell) {
                return _(cellLabels).contains($(cell).attr("data-cell-label"));
            });
        },

        getGivenDigitHash: function () {
            return _.object(
                _(this.$cells.has("input[readonly]")).map(function (cell) {
                    return [$(cell).attr("data-cell-label"), $(cell).find("input").val()];
                })
            );
        },

        getDigitHash: function () {
            return _.object(
                _(this.$cells).map(function (cell) {
                    return [$(cell).attr("data-cell-label"), $(cell).find("input").val()];
                })
            );
        },

        populateGrid: function (digitHash) {
            this.$cells.find("input").val("").removeAttr("readonly");
            if (_.isUndefined(digitHash)) {
                digitHash = this.generateRandomDigitHash();
            }
            _(digitHash).each(function (digit, cellLabel) {
                if (/^[1-9]$/.test(digit)) {
                    this.getCell(cellLabel).find("input").val(digit).attr("readonly", true);
                }
            }, this);
        },

        generateRandomDigitHash: function () {
            var result = {};
            while (_(result).size() < 20) {
                var digit = _.random(1, 9),
                    cellLabel = _.sample(_(ALL_CELL_LABELS).difference(Object.keys(result)));
                if (this.moveIsValid(cellLabel, digit, result)) {
                    result[cellLabel] = digit;
                }
            }
            return result;
        },

        attachEvents: function () {
            var plugin = this,
                $grid = plugin.$grid;

            $grid.on("keypress", ".cell input", function (event) {
                var $cell = $(this).closest(".cell"),
                    $row = $(this).closest("tr"),
                    columnLabel = $cell.attr("data-column-label"),
                    $targetCell = $(),
                    value = $(this).val();
                if (event.keyCode === 37) {  // left
                    var cursorIsAtStart = this.selectionEnd === 0;
                    if (_(value).isEmpty() || cursorIsAtStart || $(this).is("[readonly]")) {
                        $targetCell = $cell.prev();
                    }
                } else if (event.keyCode === 38) {  // up
                    $targetCell = $row.prev().find(".cell[data-column-label=" + columnLabel + "]");
                } else if (event.keyCode === 39) {  // right
                    var cursorIsAtEnd = this.selectionStart === value.length;
                    if (_(value).isEmpty() || cursorIsAtEnd || $(this).is("[readonly]")) {
                        $targetCell = $cell.next();
                    }
                } else if (event.keyCode === 40) {  // down
                    $targetCell = $row.next().find(".cell[data-column-label=" + columnLabel + "]");
                }
                $targetCell.find("input").select();
            });

            $grid.on("input", ".cell input", function (event) {
                var fontEms = ([1, 1, 0.9, 0.6, 0.5, 0.4][$(this).val().length] || 0.4);
                $(this).css("font-size", fontEms + "em");
                plugin.updateConflicts();
                if (plugin.isWin()) {
                    plugin.showWin();
                }
                this.setCustomValidity(" ");
                $(this).parent().toggleClass("pencil", $(this).val().length > 1);
            });
        },

        getValues: function (cells) {
            return $(cells).map(function (i, cell) {
                return $(cell).find("input").val();
            });
        },

        findConflicts: function () {
            var result = $(),
                plugin = this,
                scopes = _.union(
                    _(ROW_CELL_LABEL_HASH).values(),
                    _(COLUMN_CELL_LABEL_HASH).values(),
                    ALL_BOX_CELL_LABELS);
            scopes.forEach(function (scope) {
                var $scopeCells = plugin.getCells(scope),
                    scopeDigits = plugin.getValues($scopeCells).filter(function (i, value) {
                        return /^[1-9]$/.test(value);
                    }),
                    counter = _(scopeDigits).countBy(),
                    duplicateDigits = Object.keys(counter).filter(function (digit) {
                        return counter[digit] > 1;
                    });
                result = result.add($scopeCells.filter(function (i, cell) {
                    return _(duplicateDigits).contains($(cell).find("input").val());
                }));
            });
            return result;
        },

        moveIsValid: function (cellLabel, digit, digitHash) {
            if (_(digitHash).isUndefined()) {
                digitHash = this.getDigitHash();
            }
            if (digit === "") {
                return true;
            } else if (/^[1-9]$/.test(digit)) {
                return _(PEER_CELL_LABEL_HASH[cellLabel]).all(function (otherCellLabel) {
                    return +digitHash[otherCellLabel] !== +digit;
                });
            } else {
                return false;
            }
        },

        updateConflicts: function () {
            var $conflicts = this.findConflicts();
            $conflicts.addClass("conflict");
            this.$cells.not($conflicts).removeClass("conflict");
        },

        isWin: function () {
            return _(this.getValues(this.$cells)).all(function (value) {
                return /^[1-9]$/.test(value);
            }) && this.findConflicts().length === 0;
        },

        showWin: function () {
            alert("Congratulations!");
        }
    });

    $.fn.uberSudoku = function (options) {
        return this.each(function () {
            if (! $(this).data("plugin_uberSudoku")) {
                $(this).data("plugin_uberSudoku", new Plugin(this, options));
            }
        });
    };
})(jQuery);
