$(document).ready(function () {
    $(".uberSudoku").each(function () {
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
});
