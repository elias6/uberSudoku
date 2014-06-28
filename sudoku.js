$(document).ready(function () {
    $(".sudokuContainer").uberSudoku();
});

(function ($, undefined) {
    function Plugin(element) {
        this.element = element;
    }

    $.extend(Plugin.prototype, {
        rows: function () {
            var result = [];
            $(this.element).find("tr").each(function (i, row) {
                result.push($(row).find("td"));
            });
            return result;
        },

        columns: function () {
            var result = [];
            for (var i = 0; i < 9; i++) {
                result.push($(this.element).find("td").filter(function (j, cell) {
                    return $(cell).index() === i;
                }));
            }
            return result;
        },

        boxes: function () {
            var result = [];
            for (var i = 0; i < 3; i++) {
                var $band = $(this.element).find("tr").slice(3 * i, 3 * (i + 1));
                for (var j = 0; j < 3; j++) {
                    result.push($band.find("td").filter(function (k, cell) {
                        var index = $(cell).index();
                        return index >= 3 * j && index < 3 * (j + 1);
                    }));
                }
            }
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

            var $scopes = $(this.rows()).add(this.columns()).add(this.boxes());
            $scopes.each(function (i, scope) {
                var scopeValues = plugin.getValues(scope),
                    scopeNumbers = scopeValues.filter(function (j, value) {
                        return /^\d$/.test(value);
                    }),
                    counter = _(scopeNumbers).countBy(),
                    duplicateNumbers = Object.keys(counter).filter(function (number) {
                        return counter[number] > 1;
                    });
                result = result.add($(scope).filter(function (j, cell) {
                    return duplicateNumbers.indexOf($(cell).find("input").val()) !== -1;
                }));
            });
            return result;
        },

        updateConflicts: function () {
            var $conflicts = this.findConflicts();
            $conflicts.addClass("conflict");
            $(this.element).find("td").not($conflicts).removeClass("conflict");
        }
    });

    $.fn.uberSudoku = function (options) {
        return this.each(function () {
            if (! $(this).data("plugin_uberSudoku")) {
                $(this).data("plugin_uberSudoku", new Plugin(this, options));
            }

            var plugin = $(this).data("plugin_uberSudoku");

            $(this).addClass("uberSudoku");

            var $grid = $("<table class='grid' />").appendTo(this);

            for (var i = 0; i < 9; i++) {
                var $row = $("<tr />").appendTo($grid);
                for (var j = 0; j < 9; j++) {
                    var $cell = $("<td />").appendTo($row);
                }
            }

            $grid.find("td:not(.given)").each(function (i, cell) {
                $(cell).append("<input type='text' maxlength='1' />");
            });

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
            });
        });
    };
})(jQuery);
