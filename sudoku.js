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

            _(9).times(function () {
                $row = $("<tr />").appendTo($grid);
                _(9).times(function () {
                    $cell = $("<td />").appendTo($row);
                });
            });

            $grid.find("td:not(.given)").each(function () {
                $(this).append("<input type='text' maxlength='1' />");
            });
        });

        return this;
    };
})(jQuery);
