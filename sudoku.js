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
            var plugin = this;
            this.$grid = this.createGrid();

            this.rows = [];
            this.$grid.find("tr").each(function (i, row) {
                plugin.rows.push($(row).find("td"));
            });

            this.columns = [];
            _(9).times(function (i) {
                plugin.columns.push(plugin.$grid.find("td").filter(function (j, cell) {
                    return $(cell).index() === i;
                }));
            });

            this.boxes = [];
            _(3).times(function (i) {
                var $band = plugin.$grid.find("tr").slice(3 * i, 3 * (i + 1));
                _(3).times(function (j) {
                    plugin.boxes.push($band.find("td").filter(function (k, cell) {
                        var index = $(cell).index();
                        return index >= 3 * j && index < 3 * (j + 1);
                    }));
                });
            });

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
            this.$grid.find("td input").val("").removeAttr("readonly");
            var givenCount = 0;
            while (givenCount < 30) {
                var rowIndex = _.random(0, 8),
                    columnIndex = _.random(0, 8),
                    digit = _.random(1, 9),
                    $input = this.$grid.find("tr").eq(rowIndex).find("td").eq(columnIndex)
                        .find("input");
                if ($input.val() === "" && this.moveIsValid(rowIndex, columnIndex, digit)) {
                    $input.val(digit).attr("readonly", true)
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

        moveIsValid: function (rowIndex, columnIndex, digit) {
            if (digit === "") {
                return true;
            } else if (/^\d$/.test(digit)) {
                var $cell = this.$grid.find("tr").eq(rowIndex).find("td").eq(columnIndex),
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
