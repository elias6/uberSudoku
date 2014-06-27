$(document).ready(function () {
    $(".sudokuContainer").uberSudoku();
});

(function ($, undefined) {
    function Plugin (element) {
        this.element = element;
    }

    $.extend(Plugin.prototype, {
        getRow: function (element) {
            var $cell = $(element).closest("td");
            return $(this.rows()).filter(function (i, row) {
                return row.filter($cell).length > 0;
            })[0];
        },

        getColumn: function (element) {
            var $cell = ($(element).closest("td"));
            return $(this.columns()).filter(function (i, column) {
                return column.filter($cell).length > 0;
            })[0];
        },

        getBox: function (element) {
            var $cell = $(element).closest("td");
            return $(this.boxes()).filter(function (i, box) {
                return box.filter($cell).length > 0;
            })[0];
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
        },

        updateConflicts: function () {
            $(this.element).find("td").removeClass("conflict");
            var plugin = this;

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
                $(scope).filter(function (j, cell) {
                    return duplicateNumbers.indexOf($(cell).find("input").val()) !== -1;
                }).addClass("conflict");
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

            $grid.on("input", "td input", function (event) {
                plugin.updateConflicts();
            });
        });
    };
})(jQuery);
