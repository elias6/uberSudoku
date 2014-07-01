"use strict";

$(document).ready(function () {
    $(".sudokuContainer").uberSudoku();
});

(function ($, undefined) {
    function Plugin(element) {
        this.element = element;
        this.init();
    }

    $.extend(Plugin.prototype, {
        init: function () {
            this.$grid = this.createGrid();

            this.$cells = this.$grid.find(".cell");

            this.rows = _("abcdefghi").map(function (rowLabel) {
                return this.$cells.filter("[data-row-label=" + rowLabel + "]");
            }, this);

            this.columns = _.range(1, 10).map(function (columnLabel) {
                return this.$cells.filter("[data-column-label=" + columnLabel + "]");
            }, this);

            this.boxes = _.flatten(
                ["abc", "def", "ghi"].map(function (rowLabels) {
                    var $band = this.$cells.filter(function (i, cell) {
                        return _(rowLabels).contains($(cell).attr("data-row-label"));
                    });
                    return ["123", "456", "789"].map(function (columnLabels) {
                        return $band.filter(function (i, cell) {
                            return _(columnLabels).contains($(cell).attr("data-column-label"));
                        });
                    });
                }, this)
            );

            this.populateGrid();
            this.attachEvents();
            $(this.element).append(this.$grid);
        },

        createGrid: function () {
            $(this.element).empty().addClass("uberSudoku");

            var $grid = $("<table class='grid' />");

            _(9).times(function (i) {
                var rowLabel = 'abcdefghi'[i],
                    $row = $("<tr />").appendTo($grid);
                _(9).times(function (j) {
                    var columnLabel = j + 1,
                        $cell = $("<td />", {
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
                    cellLabel = _.sample("abcdefghi") + _.random(1, 9),
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
                var $cell = this.getCell(cellLabel),
                    $row = _(this.rows).find(function ($r) {
                        return $r.is($cell);
                    }),
                    $column = _(this.columns).find(function ($c) {
                        return $c.is($cell);
                    }),
                    $box = _(this.boxes).find(function ($b) {
                        return $b.is($cell);
                    }),
                    $inputsInScopes = $row.add($column).add($box).not($cell).find("input");
                return _($inputsInScopes).all(function (input) {
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
