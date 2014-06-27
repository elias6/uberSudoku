$(document).ready(function () {
    $(".sudokuContainer").uberSudoku();
});

(function ($, undefined) {
    function Plugin (element) {
        this.element = element;
    }

    $.extend(Plugin.prototype, {
        getRow: function (cell) {
            var $cell = $(cell).closest("td");
            return $cell.closest("tr").find("td");
        },

        getColumn: function (cell) {
            var $cell = $(cell).closest("td"),
                index = $cell.index();
            return $cell.closest(".grid").find("td").filter(function (i, cell) {
                return $(cell).index() === index;
            });
        },

        getBox: function (cell) {
            var $cell = $(cell).closest("td"),
                rowIndex = $cell.closest("tr").index(),
                columnIndex = $cell.index(),
                band = [[0, 1, 2], [3, 4, 5], [6, 7, 8]][Math.floor(rowIndex / 3)],
                stack = [[0, 1, 2], [3, 4, 5], [6, 7, 8]][Math.floor(columnIndex / 3)];
            return $cell.closest(".grid").find("tr").filter(function (i, row) {
                return band.indexOf($(row).index()) !== -1;
            }).find("td").filter(function (i, cell) {
                return stack.indexOf($(cell).index()) !== -1;
            });
        },

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
                    result.push($band.find("td").filter(function (i, cell) {
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
                $row = $("<tr />").appendTo($grid);
                for (var j = 0; j < 9; j++) {
                    $cell = $("<td />").appendTo($row);
                }
            }

            $grid.find("td:not(.given)").each(function (i, cell) {
                $(cell).append("<input type='text' maxlength='1' />");
            });
        });
    };
})(jQuery);
