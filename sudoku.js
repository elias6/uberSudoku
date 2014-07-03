"use strict";

$(document).ready(function () {
    $(".sudokuContainer").uberSudoku();
});

(function ($, undefined) {
    if (! ("_" in window)) {
        throw "Underscore.js must be loaded for this plugin to work"
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
            return [cellLabel, peerLabels.sort()];
        })),
        isSudokuDigit = function (digit) {
            return /^[1-9]$/.test(digit);
        };

    $.extend(Plugin.prototype, {
        init: function () {
            this.initGame();
        },

        initGame: function () {
            $(this.element).empty().addClass("uberSudoku");

            this.$grid = $(
                _.template(
                    "<table class='grid'>" +
                        "<% ALL_ROW_LABELS.forEach(function (rowLabel) { %>" +
                            "<tr>" +
                                "<% ALL_COLUMN_LABELS.forEach(function (columnLabel) { %>" +
                                    "<td " +
                                        "class='cell' " +
                                        "data-row-label='<%- rowLabel %>' " +
                                        "data-column-label='<%- columnLabel %>' " +
                                        "data-cell-label='<%- rowLabel %><%- columnLabel %>'>" +
                                            "<input type='tel' maxlength='5' />" +
                                    "</td>" +
                                "<% }); %>" +
                            "</tr>" +
                        "<% }); %>" +
                    "</table>",
                    {ALL_ROW_LABELS: ALL_ROW_LABELS, ALL_COLUMN_LABELS: ALL_COLUMN_LABELS}
            ));

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
            return $(_(this.$cells).find(function (cell) {
                return $(cell).attr("data-cell-label") === cellLabel;
            }));
        },

        getCells: function (cellLabels) {
            return this.$cells.filter(function (i, cell) {
                return _(cellLabels).contains($(cell).attr("data-cell-label"));
            });
        },

        getGivenDigitHash: function () {
            return _.object(
                _(this.$cells.has("input[readonly]")).map(function (cell) {
                    return [$(cell).attr("data-cell-label"), $(cell).find("input").val()];
                })
            );
        },

        getDigitHash: function () {
            return _.object(
                _(this.$cells).map(function (cell) {
                    return [$(cell).attr("data-cell-label"), $(cell).find("input").val()];
                })
            );
        },

        restoreGame: function () {
            if ("uberSudoku.givenDigitHash" in localStorage) {
                this.populateGrid(JSON.parse(localStorage["uberSudoku.givenDigitHash"]));
                if ("uberSudoku.digitHash" in localStorage) {
                    var digitHash = JSON.parse(localStorage["uberSudoku.digitHash"]);
                    _(this.$cells).each(function (cell) {
                        var cellLabel = $(cell).attr("data-cell-label");
                        if (cellLabel in digitHash) {
                            var $input = $(cell).find("input:not([readonly])");
                            $input.val(digitHash[cellLabel]).trigger("input.other");
                        }
                    });
                }
                this.updateConflicts();
                if (this.isWin()) {
                    this.showWin();
                }
                return true;
            }
            return false;
        },

        saveState: function () {
            localStorage.setItem("uberSudoku.digitHash", JSON.stringify(this.getDigitHash()));
        },

        populateGrid: function (digitHash) {
            _(this.$cells).each(function (cell) {
                var digit = digitHash[$(cell).attr("data-cell-label")];
                if (isSudokuDigit(digit)) {
                    $(cell).find("input").val(digit).attr("readonly", true);
                } else {
                    $(cell).find("input").val("").removeAttr("readonly");
                }
            });
            localStorage.setItem("uberSudoku.givenDigitHash", JSON.stringify(digitHash));
        },

        generateRandomDigitHash: function (difficulty) {
            // Difficulty should be an integer from 1 to 5 inclusively.
            if (_(difficulty).isUndefined()) {
                difficulty = 2;
            }
            var result;
            while (true) {
                result = {};
                _(11).times(function () {
                    var digit = _.random(1, 9).toString(),
                        cellLabel = _.sample(ALL_CELL_LABELS);
                    if (! (cellLabel in result) && this.moveIsValid(cellLabel, digit, result)) {
                        result[cellLabel] = digit;
                    }
                }, this);
                result = this.solve(result);
                if (result) {
                    break;
                }                
            }
            var totalGivenTarget = [50, 42, 33, 29, 24][difficulty - 1],
                minGivensPerRowOrColumn = [5, 4, 3, 2, 0][difficulty - 1];
            while (_(result).size() > totalGivenTarget) {
                var cellLabel = _.sample(ALL_CELL_LABELS),
                    row = ROW_CELL_LABEL_HASH[cellLabel.charAt(0)],
                    column = COLUMN_CELL_LABEL_HASH[cellLabel.charAt(1)],
                    rowGivenCount = _(row).intersection(Object.keys(result)).length,
                    columnGivenCount = _(column).intersection(Object.keys(result)).length,
                    okToDeleteCell = rowGivenCount >= minGivensPerRowOrColumn &&
                        columnGivenCount >= minGivensPerRowOrColumn;
                if (okToDeleteCell) {
                    delete result[cellLabel];
                }                    
            }
            return result;
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

            $grid.on("input.saveState", ".cell input", function () {
                plugin.saveState();
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
                plugin.populateGrid(plugin.generateRandomDigitHash($(this).data("difficulty")));
                localStorage.setItem("uberSudoku.digitHash", JSON.stringify(plugin.getDigitHash()));
            });

            $(window).resize(function () {
                plugin.positionPopup($(plugin.element).find(".popup:visible"));
            });

            $(document).on("keypress", function (event) {
                if (event.keyCode === 27) {
                    $(".popup").hide();
                }
            });
        },

        getValues: function (cells) {
            return _(cells).map(function (cell) {
                return $(cell).find("input").val();
            });
        },

        findConflicts: function () {
            var result = $(),
                plugin = this,
                scopes = _.union(
                    _(ROW_CELL_LABEL_HASH).values(),
                    _(COLUMN_CELL_LABEL_HASH).values(),
                    ALL_BOX_CELL_LABELS);
            scopes.forEach(function (scope) {
                var $scopeCells = plugin.getCells(scope),
                    scopeDigits = plugin.getValues($scopeCells).filter(isSudokuDigit),
                    counter = _(scopeDigits).countBy(),
                    duplicateDigits = Object.keys(counter).filter(function (digit) {
                        return counter[digit] > 1;
                    });
                result = result.add($scopeCells.filter(function (i, cell) {
                    return _(duplicateDigits).contains($(cell).find("input").val());
                }));
            });
            return result;
        },

        moveIsValid: function (cellLabel, digit, digitHash) {
            if (_(digitHash).isUndefined()) {
                digitHash = this.getDigitHash();
            }
            if (digit === "") {
                return true;
            } else if (isSudokuDigit(digit)) {
                return _(PEER_CELL_LABEL_HASH[cellLabel]).all(function (otherCellLabel) {
                    return +digitHash[otherCellLabel] !== +digit;
                });
            } else {
                return false;
            }
        },

        updateConflicts: function () {
            var $conflicts = this.findConflicts();
            $conflicts.addClass("conflict");
            this.$cells.not($conflicts).removeClass("conflict");
        },

        isWin: function () {
            return _(this.getValues(this.$cells)).all(isSudokuDigit) &&
                this.findConflicts().length === 0;
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

        solve: function (digitHash) {
            function findPossibleDigits(digitHash) {
                var possibleDigits = {};
                ALL_CELL_LABELS.forEach(function (cellLabel) {
                    possibleDigits[cellLabel] = _.range(1, 10).map(function (digit) {
                        return digit.toString();
                    });
                });
                _(ALL_CELL_LABELS).every(function (cellLabel) {
                    var digit = digitHash[cellLabel];
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
                    var peerLabels = _(PEER_CELL_LABEL_HASH[cellLabel]).without(cellLabel);
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
                        return _(possibleDigits[otherCellLabel]).contains(digit);
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

            if (_(digitHash).isUndefined()) {
                digitHash = this.getGivenDigitHash();
            }
            var result = search(findPossibleDigits(digitHash));
            if (_(result).isObject()) {
                _(result).each(function (digits, cellLabel) {
                    result[cellLabel] = digits[0];
                });
            }
            return result;
        },

        applySolution: function (solution) {
            _(solution).each(function (digit, cellLabel) {
                this.getCell(cellLabel).find("input:not([readonly])")
                    .val(digit).trigger("input.other");
            }, this);
            plugin.updateConflicts();
            plugin.saveState();
        },

        test: function () {
            var easyPuzzleDigitHash = {
                    a3: 3, a5: 2, a7: 6, b1: 9, b4: 3, b6: 5, b9: 1, c3: 1, c4: 8, c6: 6, c7: 4,
                    d3: 8, d4: 1, d6: 2, d7: 9, e1: 7, e9: 8, f3: 6, f4: 7, f6: 8, f7: 2, g3: 2,
                    g4: 6, g6: 9, g7: 5, h1: 8, h4: 2, h6: 3, h9: 9, i3: 5, i5: 1, i7: 3 },
                hardPuzzleDigitHash = {
                    a8: 1, a9: 2, b5: 3, b6: 5, c4: 6, c8: 7, d1: 7, d7: 3, e4: 4, e7: 8, f1: 1,
                    g4: 1, g5: 2, h2: 8, h8: 4, i2: 5, i7: 6},
                harderPuzzleDigitHash = {
                    a1: 4, a7: 8, a9: 5, b2: 3, c4: 7, d2: 2, d8: 6, e5: 8, e7: 4, f5: 1, g4: 6,
                    g6: 3, g8: 7, h1: 5, h4: 2, i1: 1, i3: 4},
                worldsHardestPuzzleDigitHash = {
                    a1: 8, b3: 3, b4: 6, c2: 7, c5: 9, c7: 2, d2: 5, d6: 7, e5: 4, e6: 5, e7: 7,
                    f4: 1, f8: 3, g3: 1, g8: 6, g9: 8, h3: 8, h4: 5, h8: 1, i2: 9, i7: 4},
                plugin = $(".sudokuContainer").data("plugin_uberSudoku");
            plugin.populateGrid(harderPuzzleDigitHash);
            plugin.applySolution(plugin.solve());
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
