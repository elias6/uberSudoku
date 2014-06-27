$(document).ready(function () {
    $(".sudokuContainer").uberSudoku();
});

(function ($, undefined) {
    $.fn.uberSudoku = function (options) {
        function getRow(cell) {
            var $cell = $(cell).closest("td");
            return $cell.closest("tr").find("td");
        }

        function getColumn(cell) {
            var $cell = $(cell).closest("td"),
                index = $cell.index();
            return $cell.closest(".grid").find("td").filter(function () {
                return $(this).index() === index;
            });
        }

        function getBox(cell) {
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

        this.each(function () {
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
