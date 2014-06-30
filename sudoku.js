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
            this.populateGrid();
            this.attachEvents();
            $(this.element).append(this.$grid);
        },

        createGrid: function () {
            $(this.element).empty().addClass("uberSudoku");

            var $grid = $("<table class='grid' />");

            _(9).times(function () {
                var $row = $("<tr />").appendTo($grid);
                _(9).times(function () {
                    var $cell = $("<td><input type='text' maxlength='1' pattern='[0-9]*' /></td>")
                        .appendTo($row);
                });
            });

            return $grid;
        },

        populateGrid: function () {
            var givenCount = 0;
            while (givenCount < 30) {
                var rowIndex = _.random(0, 8),
                    columnIndex = _.random(0, 8),
                    digit = _.random(1, 9),
                    $input = $(this.$grid).find("tr").eq(rowIndex).find("td").eq(columnIndex)
                        .find("input");
                $input.val(digit).attr("readonly", true);
                if (this.findConflicts().length > 0) {
                    $input.val("").attr("readonly", false);
                } else {
                    givenCount++;
                }
            }
        },

        attachEvents: function () {
            var plugin = this,
                $grid = plugin.$grid;

            $grid.on("keypress", "td input", function (event) {
                var rowIndex = $(this).closest("tr").index(),
                    columnIndex = $(this).closest("td").index(),
                    $targetCell;
                if (event.keyCode === 37 && columnIndex > 0) {  // left
                    $targetCell = $(this).closest("tr").find("td").eq(columnIndex - 1);
                } else if (event.keyCode === 38 && rowIndex > 0) {  // up
                    $targetCell = $grid.find("tr").eq(rowIndex - 1).find("td").eq(columnIndex);
                } else if (event.keyCode === 39 && columnIndex < 8) {  // right
                    $targetCell = $(this).closest("tr").find("td").eq(columnIndex + 1);
                } else if (event.keyCode === 40 && rowIndex < 8) {  // down
                    $targetCell = $grid.find("tr").eq(rowIndex + 1).find("td").eq(columnIndex);
                }
                if ($targetCell) {
                    $targetCell.find("input").focus().select();
                }
            });

            $grid.on("input", "td input", function (event) {
                plugin.updateConflicts();
                if (plugin.isWin()) {
                    plugin.showWin();
                }
                this.setCustomValidity(" ");
            });
        },

        getRows: function () {
            var result = [];
            this.$grid.find("tr").each(function (i, row) {
                result.push($(row).find("td"));
            });
            return result;
        },

        getColumns: function () {
            var result = [];
            _(9).times(function (i) {
                result.push(this.$grid.find("td").filter(function (j, cell) {
                    return $(cell).index() === i;
                }));
            }, this);
            return result;
        },

        getBoxes: function () {
            var result = [];
            _(3).times(function (i) {
                var $band = this.$grid.find("tr").slice(3 * i, 3 * (i + 1));
                _(3).times(function (j) {
                    result.push($band.find("td").filter(function (k, cell) {
                        var index = $(cell).index();
                        return index >= 3 * j && index < 3 * (j + 1);
                    }));
                });
            }, this);
            return result;
        },

        getValues: function (cells) {
            return $(cells).map(function (i, cell) {
                return $(cell).find("input").val();
            });
        },

        findConflicts: function () {
            var result = $(),
                plugin = this;

            var $scopes = $(this.getRows()).add(this.getColumns()).add(this.getBoxes());
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

        updateConflicts: function () {
            var $conflicts = this.findConflicts();
            $conflicts.addClass("conflict");
            this.$grid.find("td").not($conflicts).removeClass("conflict");
        },

        isWin: function () {
            return _(this.getValues(this.$grid.find("td"))).all(function (value) {
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
