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
            return $cell.closest(".grid").find("td").filter(function () {
                return $(this).index() === index;
            });
        },

        getBox: function (cell) {
            var $cell = $(cell).closest("td"),
                rowIndex = $cell.closest("tr").index(),
                columnIndex = $cell.index(),
                band = [[0, 1, 2], [3, 4, 5], [6, 7, 8]][Math.floor(rowIndex / 3)],
                stack = [[0, 1, 2], [3, 4, 5], [6, 7, 8]][Math.floor(columnIndex / 3)];
            return $cell.closest(".grid").find("tr").filter(function () {
                return band.indexOf($(this).index()) !== -1;
            }).find("td").filter(function () {
                return stack.indexOf($(this).index()) !== -1;
            });
        },

        rows: function () {
            var result = [];
            $(this.element).find("tr").each(function () {
                result.push($(this).find("td"));
            });
            return result;
        },

        columns: function () {
            var result = [];
            for (var i = 0; i < 9; i++) {
                result.push($(this.element).find("td").filter(function () {
                    return $(this).index() === i;
                }));
            }
            return result;
        },

        boxes: function () {
            var result = [];
            for (var i = 0; i < 3; i++) {
                var $band = $(this.element).find("tr").slice(3 * i, 3 * (i + 1));
                for (var j = 0; j < 3; j++) {
                    result.push($band.find("td").filter(function () {
                        var index = $(this).index();
                        return index >= 3 * j && index < 3 * (j + 1);
                    }));
                }
            }
            return result;
        }
    });

    $.fn.uberSudoku = function (options) {
        this.each(function () {
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

            $grid.find("td:not(.given)").each(function () {
                $(this).append("<input type='text' maxlength='1' />");
            });
        });

        return this;
    };
})(jQuery);
