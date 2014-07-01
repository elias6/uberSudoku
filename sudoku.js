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
        ROW_CELL_LABELS = _.object(ALL_ROW_LABELS.map(function (rowLabel) {
            return [
                rowLabel,
                ALL_COLUMN_LABELS.map(function (columnLabel) {
                    return rowLabel + columnLabel;
                })
            ];
        })),
        COLUMN_CELL_LABELS = _.object(ALL_COLUMN_LABELS.map(function (columnLabel) {
            return [
                columnLabel,
                ALL_ROW_LABELS.map(function (rowLabel) {
                    return rowLabel + columnLabel;
                })
            ];
        })),
        BOX_CELL_LABELS = _.object(ALL_CELL_LABELS.map(function (cellLabel) {
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
            boxCellLabels.sort();
            return [cellLabel, boxCellLabels];
        })),
        ALL_BOX_CELL_LABELS = _.uniq(_.values(BOX_CELL_LABELS), JSON.stringify),
        PEER_CELL_LABELS = _.object(ALL_CELL_LABELS.map(function (cellLabel) {
            var peerLabels = _.union(
                    ROW_CELL_LABELS[cellLabel.charAt(0)],
                    COLUMN_CELL_LABELS[cellLabel.charAt(1)],
                    BOX_CELL_LABELS[cellLabel]);
            peerLabels.sort();
            return [cellLabel, peerLabels];
        }));

    $.extend(Plugin.prototype, {
        init: function () {
            this.$grid = this.createGrid();

            this.$cells = this.$grid.find(".cell");

            this.rows = ALL_ROW_LABELS.map(function (rowLabel) {
                return this.$cells.filter("[data-row-label=" + rowLabel + "]");
            }, this);

            this.columns = ALL_COLUMN_LABELS.map(function (columnLabel) {
                return this.$cells.filter("[data-column-label=" + columnLabel + "]");
            }, this);

            this.boxes = ALL_BOX_CELL_LABELS.map(function (boxCellLabels) {
                return this.$cells.filter(function (i, cell) {
                    return _(boxCellLabels).contains($(cell).attr("data-cell-label"));
                });
            }, this);

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
            return this.$cells.filter(function (i, cell) {
                return $(cell).attr("data-cell-label") === cellLabel;
            });
        },

        populateGrid: function () {
            this.$cells.find("input").val("").removeAttr("readonly");
            var givenCount = 0;
            while (givenCount < 20) {
                var digit = _.random(1, 9),
                    cellLabel = _.sample(ALL_ROW_LABELS) + _.sample(ALL_COLUMN_LABELS),
                    $input = this.getCell(cellLabel).find("input");
                if ($input.val() === "" && this.moveIsValid(cellLabel, digit)) {
                    $input.val(digit).attr("readonly", true)
                    givenCount++;
                }
            }
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
                    if (value.length === 0 || cursorIsAtStart || $(this).is("[readonly]")) {
                        $targetCell = $cell.prev();
                    }
                } else if (event.keyCode === 38) {  // up
                    $targetCell = $row.prev().find(".cell[data-column-label=" + columnLabel + "]");
                } else if (event.keyCode === 39) {  // right
                    var cursorIsAtEnd = this.selectionStart === value.length;
                    if (value.length === 0 || cursorIsAtEnd || $(this).is("[readonly]")) {
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
                plugin = this;

            var $scopes = $(this.rows).add(this.columns).add(this.boxes);
            $scopes.each(function (i, scope) {
                var scopeValues = plugin.getValues(scope),
                    scopeDigits = scopeValues.filter(function (j, value) {
                        return /^[1-9]$/.test(value);
                    }),
                    counter = _(scopeDigits).countBy(),
                    duplicateDigits = Object.keys(counter).filter(function (digit) {
                        return counter[digit] > 1;
                    });
                result = result.add($(scope).filter(function (j, cell) {
                    return _(duplicateDigits).contains($(cell).find("input").val());
                }));
            });
            return result;
        },

        moveIsValid: function (cellLabel, digit) {
            if (digit === "") {
                return true;
            } else if (/^[1-9]$/.test(digit)) {
                var $peers = this.$cells.filter(function (i, cell) {
                        return _(PEER_CELL_LABELS[cellLabel])
                            .contains($(cell).attr("data-cell-label"));
                    });
                return _($peers.find("input")).all(function (input) {
                    return $(input).val() !== digit.toString();
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
