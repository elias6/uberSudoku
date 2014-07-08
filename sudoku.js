"use strict";

$(document).ready(function () {
    $(".sudokuContainer").uberSudoku();
});

(function ($, undefined) {
    if (! ("_" in window)) {
        throw "Underscore.js must be loaded for this plugin to work";
    }

    function Plugin(element) {
        this.element = element;
        this.init();
    }

    var ALL_ROW_LABELS = ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
        ALL_COLUMN_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
        ALL_CELL_LABELS = _.flatten(
            ALL_ROW_LABELS.map(function (rowLabel) {
                return ALL_COLUMN_LABELS.map(function (columnLabel) {
                    return rowLabel + columnLabel;
                });
            })
        ),
        ROW_CELL_LABEL_HASH = _(ALL_CELL_LABELS).groupBy(function (cellLabel) {
            return cellLabel.charAt(0);
        }),
        COLUMN_CELL_LABEL_HASH = _(ALL_CELL_LABELS).groupBy(function (cellLabel) {
            return cellLabel.charAt(1);
        }),
        BOX_CELL_LABEL_HASH = _.object(ALL_CELL_LABELS.map(function (cellLabel) {
            var rowLabel = cellLabel.charAt(0),
                columnLabel = cellLabel.charAt(1),
                bandRowPos = 3 * Math.floor(ALL_ROW_LABELS.indexOf(rowLabel) / 3),
                bandRowLabels = ALL_ROW_LABELS.slice(bandRowPos, bandRowPos + 3),
                stackColumnPos = 3 * Math.floor(ALL_COLUMN_LABELS.indexOf(columnLabel) / 3),
                stackColumnLabels = ALL_COLUMN_LABELS.slice(stackColumnPos, stackColumnPos + 3),
                boxCellLabels = _.flatten(
                    bandRowLabels.map(function (bandRowLabel) {
                        return stackColumnLabels.map(function (stackColumnLabel) {
                            return bandRowLabel + stackColumnLabel;
                        });
                    })
                );
            return [cellLabel, boxCellLabels.sort()];
        })),
        ALL_BOX_CELL_LABELS = _.uniq(_.values(BOX_CELL_LABEL_HASH), JSON.stringify),
        PEER_CELL_LABEL_HASH = _.object(ALL_CELL_LABELS.map(function (cellLabel) {
            var peerLabels = _.union(
                    ROW_CELL_LABEL_HASH[cellLabel.charAt(0)],
                    COLUMN_CELL_LABEL_HASH[cellLabel.charAt(1)],
                    BOX_CELL_LABEL_HASH[cellLabel]);
            peerLabels = _(peerLabels).without(cellLabel);
            return [cellLabel, peerLabels.sort()];
        })),
        isSudokuDigit = function (digit) {
            return /^[1-9]$/.test(digit);
        };

    $.extend(Plugin.prototype, {
        init: function () {
            $(this.element).empty().addClass("uberSudoku");

            this.$grid = $("<table class='grid' />");

            this.cellHash = {};

            ALL_ROW_LABELS.forEach(function (rowLabel) {
                var $row = $("<tr />").appendTo(this.$grid);
                ALL_COLUMN_LABELS.forEach(function (columnLabel) {
                    var $cell = $("<td />", {
                            "class": "cell",
                            "data-row-label": rowLabel,
                            "data-column-label": columnLabel,
                            "data-cell-label": rowLabel + columnLabel});
                    $cell.append("<input type='tel' maxlength='5' />");
                    this.cellHash[rowLabel + columnLabel] = $cell[0];
                    $row.append($cell);
                }, this);
            }, this);

            this.$cells = this.$grid.find(".cell");
            $(this.element).append(this.$grid);
            this.$winPopup = $(
                "<div class='winPopup popup'>" +
                    "<p>Congratulations!</p>" +
                    "<button type='button' class='closeButton'>Close</button>" +
                "</div>").appendTo(this.element);
            this.$difficultyPopup = $(
                _.template(
                    "<div class='difficultyPopup popup'>" +
                        "<div class='xContainer'>" +
                            "<button type='button' class='x closeButton'>X</button>" +
                        "</div>" +
                        "<h2>Select difficulty</h2>" +
                        "<% _(difficulties).each(function (difficulty, i) { %>" +
                            "<div>" +
                                "<button type='button' class='closeButton' " +
                                    "data-difficulty='<%- i + 1 %>'>" +
                                        "<%- difficulty %>" +
                                "</button>" +
                            "</div>" +
                        "<% }); %>" +
                    "</div>"                    
                , {difficulties: ["Very easy", "Easy", "Medium", "Hard", "Insane"]}
            )).appendTo(this.element);
            $(this.element).append(
                "<div class='newGameContainer'>" +
                    "<button type='button' class='newGameButton'>New game</button>" +
                "</div>"
            );
            this.attachEvents();

            this.restoreGame() || $(this.element).find(".newGameButton").click();
        },

        getCell: function (cellLabel) {
            return $(this.cellHash[cellLabel]);
        },

        getCells: function (cellLabels) {
            return $(_(_(this.cellHash).pick(cellLabels)).values());
        },

        getGrid: function () {
            var result = new Grid();
            _(this.$cells).each(function (cell) {
                var $input = $(cell).find("input");
                if ($input.is("[readonly]")) {
                    result.givenDigits[$(cell).attr("data-cell-label")] = $input.val();
                } else {
                    result.userDigits[$(cell).attr("data-cell-label")] = $input.val();
                }
            });
            return result;
        },

        restoreGame: function () {
            if ("uberSudoku" in localStorage) {
                var gridData = JSON.parse(localStorage.uberSudoku),
                    grid = new Grid(gridData.givenDigits, gridData.userDigits);
                this.populateGrid(grid);
                if (this.isWin()) {
                    this.showWin();
                }
                return true;
            }
            return false;
        },

        saveGame: function () {
            localStorage["uberSudoku"] = JSON.stringify(this.getGrid());
        },

        populateGrid: function (grid) {
            _(this.$cells).each(function (cell) {
                var cellLabel = $(cell).attr("data-cell-label"),
                    givenDigit = grid.givenDigits[cellLabel],
                    userDigit = grid.userDigits[cellLabel] || "";
                if (isSudokuDigit(givenDigit)) {
                    $(cell).find("input").val(givenDigit).attr("readonly", true);
                } else {
                    $(cell).find("input").val(userDigit).removeAttr("readonly")
                        .trigger("input.other");
                }
            });
            this.updateConflicts();
            this.saveGame();
        },

        generateRandomGrid: function (difficulty) {
            // Difficulty should be an integer from 1 to 5 inclusively.
            if (_(difficulty).isUndefined()) {
                difficulty = 2;
            }
            var tempGrid = new Grid(),
                solution = false;
            while (! solution) {
                tempGrid.givenDigits = {};
                _(11).times(function () {
                    var digit = _.random(1, 9).toString(),
                        cellLabel = _.sample(ALL_CELL_LABELS);
                    if (! tempGrid.givenDigits.cellLabel && tempGrid.moveIsValid(cellLabel, digit)) {
                        tempGrid.givenDigits[cellLabel] = digit;
                    }
                }, this);
                solution = this.solve(new Grid(givenDigits));
            }
            var totalGivenTarget = [50, 36, 32, 28, 22][difficulty - 1],
                minGivensPerRowOrColumn = [5, 4, 3, 2, 0][difficulty - 1],
                givenDigits = solution.getAllDigits();
            while (_(givenDigits).size() > totalGivenTarget) {
                var cellLabel = _.sample(ALL_CELL_LABELS),
                    row = ROW_CELL_LABEL_HASH[cellLabel.charAt(0)],
                    column = COLUMN_CELL_LABEL_HASH[cellLabel.charAt(1)],
                    rowGivenCount = _(row).intersection(Object.keys(givenDigits)).length,
                    columnGivenCount = _(column).intersection(Object.keys(givenDigits)).length,
                    okToDeleteCell = rowGivenCount >= minGivensPerRowOrColumn &&
                        columnGivenCount >= minGivensPerRowOrColumn;
                if (okToDeleteCell) {
                    delete givenDigits[cellLabel];
                }                    
            }
            return new Grid(givenDigits);
        },

        attachEvents: function () {
            var plugin = this,
                $grid = plugin.$grid;

            $grid.on("keydown", ".cell input", function (event) {
                if (event.keyCode >= 37 && event.keyCode <= 40) {
                    var $cell = $(this).closest(".cell"),
                        $row = $(this).closest("tr"),
                        columnLabel = $cell.attr("data-column-label"),
                        $targetCell = $(),
                        value = $(this).val();
                    if (event.keyCode === 37) {  // left
                        var cursorIsAtStart = this.selectionEnd === 0;
                        if (_(value).isEmpty() || cursorIsAtStart || $(this).is("[readonly]")) {
                            $targetCell = $cell.prev();
                        }
                    } else if (event.keyCode === 38) {  // up
                        $targetCell = $row.prev()
                            .find(".cell[data-column-label=" + columnLabel + "]");
                    } else if (event.keyCode === 39) {  // right
                        var cursorIsAtEnd = this.selectionStart === value.length;
                        if (_(value).isEmpty() || cursorIsAtEnd || $(this).is("[readonly]")) {
                            $targetCell = $cell.next();
                        }
                    } else if (event.keyCode === 40) {  // down
                        $targetCell = $row.next()
                            .find(".cell[data-column-label=" + columnLabel + "]");
                    }
                    $targetCell.find("input").focus().select();
                }
            });

            $grid.on("input.updateConflicts", ".cell input", function () {
                plugin.updateConflicts();
            });

            $grid.on("input.showWin", ".cell input", function () {
                if (plugin.isWin()) {
                    plugin.showWin();
                }
            });

            $grid.on("input.saveGame", ".cell input", function () {
                plugin.saveGame();
            });

            $grid.on("input.other", ".cell input", function () {
                var fontEms = ([1, 1, 0.9, 0.6, 0.5, 0.4][$(this).val().length] || 0.4);
                $(this).css({
                    "font-size": fontEms + "em",
                    "height": (1.25 / fontEms) + "em",
                    "width": (1.25 / fontEms) + "em"
                }).toggleClass("pencil", $(this).val().length > 1);
            });

            $grid.on("mousewheel", ".cell input", function (event) {
                event.preventDefault();
            });

            $(this.element).on("click", ".popup .closeButton", function () {
                $(this).closest(".popup").hide();
            });

            $(this.element).on("click", ".newGameButton", function () {
                plugin.showPopup(plugin.$difficultyPopup);
            });

            $(this.element).on("click", ".difficultyPopup button[data-difficulty]", function () {
                plugin.populateGrid(plugin.generateRandomGrid($(this).data("difficulty")));
            });

            $(window).resize(function () {
                plugin.positionPopup($(plugin.element).find(".popup:visible"));
            });

            $(document).on("keypress", function (event) {
                if (event.keyCode === 27) {    // escape
                    $(".popup").hide();
                }
            });
        },

        findConflicts: function () {
            return this.getCells(this.getGrid().findConflicts());
        },

        updateConflicts: function () {
            var $conflicts = this.findConflicts();
            $conflicts.addClass("conflict");
            this.$cells.not($conflicts).removeClass("conflict");
        },

        isWin: function () {
            return this.getGrid().isWin();
        },

        showPopup: function (popup) {
            this.positionPopup(popup);
            $(popup).show();
        },

        positionPopup: function (popup) {
            $(popup).css({
                top: Math.max(0, ($(window).height() - $(popup).outerHeight()) * 0.2) + "px",
                left: Math.max(0, ($(window).width() - $(popup).outerWidth()) / 2) + "px"
            });
        },

        showWin: function () {
            this.showPopup(this.$winPopup);
        },

        solve: function () {
            return this.getGrid().solve();
        }
    });

    function Grid(givenDigits, userDigits) {
        this.givenDigits = givenDigits || {};
        if (userDigits) {
            var givenDigitCells = Object.keys(givenDigits).filter(function (cellLabel) {
                return isSudokuDigit(givenDigits[cellLabel]);
            });
            this.userDigits = _(userDigits).omit(givenDigitCells);
        } else {
            this.userDigits = {};
        }
    }

    $.extend(Grid.prototype, {
        getAllDigits: function () {
            var result = {};
            _(ALL_CELL_LABELS).each(function (cellLabel) {
                result[cellLabel] = this.givenDigits[cellLabel] || this.userDigits[cellLabel] || "";
            }, this);
            return result;
        },

        getFilledDigitCount: function () {
            return _(this.getAllDigits()).filter(function (digit, cellLabel) {
                return digit.length > 0;
            }).length;
        },

        findConflicts: function () {
            var result = [],
                scopes = _.union(
                    _(ROW_CELL_LABEL_HASH).values(),
                    _(COLUMN_CELL_LABEL_HASH).values(),
                    ALL_BOX_CELL_LABELS),
                allDigits = this.getAllDigits();
            scopes.forEach(function (scopeCellLabels) {
                var scopeDigits = _(_(allDigits).pick(scopeCellLabels)).filter(isSudokuDigit),
                    counter = _(scopeDigits).countBy(),
                    duplicateDigits = Object.keys(counter).filter(function (digit) {
                        return counter[digit] > 1;
                    });
                result = result.concat(scopeCellLabels.filter(function (cellLabel) {
                    return _(duplicateDigits).contains(allDigits[cellLabel]);
                }));
            });
            return _(result).uniq();
        },

        moveIsValid: function (cellLabel, digit) {
            var allDigits = this.getAllDigits();
            if (digit === "") {
                return true;
            } else if (isSudokuDigit(digit)) {
                return _(PEER_CELL_LABEL_HASH[cellLabel]).all(function (otherCellLabel) {
                    return +allDigits[otherCellLabel] !== +digit;
                });
            } else {
                return false;
            }
        },

        isWin: function () {
            var allDigits = this.getAllDigits();
            return  _(_(allDigits).values()).all(isSudokuDigit) &&
                this.findConflicts().length === 0;
        },

        solve: function () {
            function findPossibleDigits(allDigits) {
                var possibleDigits = {};
                ALL_CELL_LABELS.forEach(function (cellLabel) {
                    possibleDigits[cellLabel] = _.range(1, 10).map(function (digit) {
                        return digit.toString();
                    });
                });
                ALL_CELL_LABELS.every(function (cellLabel) {
                    var digit = allDigits[cellLabel];
                    if (isSudokuDigit(digit)) {
                        possibleDigits = assignDigit(possibleDigits, cellLabel, digit);
                    }
                    // If no possible digits for any cell, puzzle is unsolvable, so break.
                    return possibleDigits;
                });
                return possibleDigits;
            }

            function assignDigit(possibleDigits, cellLabel, digit) {
                // WARNING: this function modifies possibleDigits
                _(possibleDigits[cellLabel]).without(digit).every(function (otherDigit) {
                    possibleDigits = eliminateDigit(possibleDigits, cellLabel, otherDigit);
                    // If no possible digits for any cell, puzzle is unsolvable, so break.
                    return possibleDigits;
                });
                return possibleDigits;
            }

            function eliminateDigit(possibleDigits, cellLabel, digit) {
                // WARNING: this function modifies possibleDigits
                if (! _(possibleDigits[cellLabel]).contains(digit)) {
                    return possibleDigits;
                }
                possibleDigits[cellLabel] = _(possibleDigits[cellLabel]).without(digit);
                if (_(possibleDigits[cellLabel]).isEmpty()) {
                    return false;    // Puzzle is unsolvable
                } else if (possibleDigits[cellLabel].length === 1) {
                    var peerLabels = _(PEER_CELL_LABEL_HASH[cellLabel]);
                    peerLabels.every(function (peerLabel) {
                        possibleDigits = eliminateDigit(possibleDigits, peerLabel,
                            possibleDigits[cellLabel][0]);
                        // If no possible digits for any cell, puzzle is unsolvable, so break.
                        return possibleDigits;
                    });
                    if (! possibleDigits) {
                        return false;    // Puzzle is unsolvable
                    }
                }
                var rowLabel = cellLabel.charAt(0),
                    columnLabel = cellLabel.charAt(1);
                [ROW_CELL_LABEL_HASH[rowLabel],
                    COLUMN_CELL_LABEL_HASH[columnLabel],
                    BOX_CELL_LABEL_HASH[cellLabel]].every(function (scopeLabels) {
                    var possibleCellLabels = scopeLabels.filter(function (otherCellLabel) {
                        // Don't use _.contains for performance reasons
                        return possibleDigits[otherCellLabel].indexOf(digit) !== -1;
                    });
                    if (_(possibleCellLabels).isEmpty()) {
                        possibleDigits = false;
                    } else if (possibleCellLabels.length === 1) {
                        possibleDigits = assignDigit(possibleDigits, possibleCellLabels[0], digit);
                    }
                    // If no possible cells for this digit, puzzle is unsolvable so break.
                    return possibleDigits;
                });
                return possibleDigits;
            }

            function search(possibleDigits) {
                // WARNING: this function modifies possibleDigits
                if (! possibleDigits) {
                    return false;    // Puzzle is unsolvable
                }
                var puzzleIsSolved = _(possibleDigits).all(function (digitsForCell, cellLabel) {
                    return digitsForCell.length === 1;
                });
                if (puzzleIsSolved) {
                    return possibleDigits;
                }
                var uncertainCells = ALL_CELL_LABELS.filter(function (cellLabel) {
                        return possibleDigits[cellLabel].length > 1;
                    }),
                    bestUncertainCell = _(uncertainCells).min(function (cellLabel) {
                        return possibleDigits[cellLabel].length;
                    }),
                    solution = false;
                _(possibleDigits[bestUncertainCell]).shuffle().every(function (digit) {
                    var possibleDigitsCopy = $.extend(true, {}, possibleDigits);
                    possibleDigitsCopy = assignDigit(possibleDigitsCopy, bestUncertainCell, digit);
                    solution = search(possibleDigitsCopy);
                    return ! solution;    // break only if a solution is found
                });
                return solution;
            }

            var solution = search(findPossibleDigits(this.getAllDigits())),
                userDigits = {};
            if (_(solution).isObject()) {
                _(solution).each(function (digits, cellLabel) {
                    userDigits[cellLabel] = digits[0];
                });
                return new Grid(this.givenDigits, userDigits);
            }
            return false;
        }
    });

    window.Grid = Grid;

    $.fn.uberSudoku = function (options) {
        return this.each(function () {
            if (! $(this).data("plugin_uberSudoku")) {
                $(this).data("plugin_uberSudoku", new Plugin(this, options));
            }
        });
    };
})(jQuery);
