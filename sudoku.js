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

            this.rows = this.$grid.find("tr").map(function (i, row) {
                return $(row).find(".cell");
            }).get();

            this.columns = _(9).times(function (i) {
                return this.$grid.find(".cell").filter(function (j, cell) {
                    return $(cell).index() === i;
                });
            }, this);

            this.boxes = _.flatten(_(3).times(function (i) {
                var $band = this.$grid.find("tr").slice(3 * i, 3 * (i + 1));
                return _(3).times(function (j) {
                    return $band.find(".cell").filter(function (k, cell) {
                        var index = $(cell).index();
                        return index >= 3 * j && index < 3 * (j + 1);
                    });
                });
            }, this), true);

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

        populateGrid: function () {
            this.$grid.find(".cell input").val("").removeAttr("readonly");
            var givenCount = 0;
            while (givenCount < 20) {
                var digit = _.random(1, 9),
                    cellLabel = _.sample("abcdefghi") + _.random(1, 9),
                    $input = this.$grid.find(".cell[data-cell-label=" + cellLabel + "] input");
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
                    scopeNumbers = scopeValues.filter(function (j, value) {
                        return /^[1-9]$/.test(value);
                    }),
                    counter = _(scopeNumbers).countBy(),
                    duplicateNumbers = Object.keys(counter).filter(function (number) {
                        return counter[number] > 1;
                    });
                result = result.add($(scope).filter(function (j, cell) {
                    return _(duplicateNumbers).contains($(cell).find("input").val());
                }));
            });
            return result;
        },

        moveIsValid: function (cellLabel, digit) {
            if (digit === "") {
                return true;
            } else if (/^[1-9]$/.test(digit)) {
                var $cell = this.$grid.find(".cell[data-cell-label=" + cellLabel + "]"),
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
            this.$grid.find(".cell").not($conflicts).removeClass("conflict");
        },

        isWin: function () {
            return _(this.getValues(this.$grid.find(".cell"))).all(function (value) {
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
