Uber Sudoku
===========

This is my Sudoku game for the Uber programming challenge.

To play the game, go here: https://mikez302.github.io/uberSudoku/

I am using jQuery and Underscore.

Here is what I would have done if I had enough time:
* Improved the algorithms used to generate the random puzzles. I could have made them faster and made the difficulty more accurate by implementing all of the ideas in the paper linked below.
* Added some unit tests.
* Made the user interface look better. It could adapt better to big or small screens. I probably could have come up with something better and simpler than the on-screen keyboards built into iOS and Android. There could be something better that comes up when the user wins.
* Used a CSS extension language such as Sass to simplify the CSS.
* Offered hints to the user.
* Maybe turned it into a truly reusable plugin that could be used in unexpected scenarios, such as if there were to be more than one Sudoku puzzle on the same page. I am most of the way there, but it was a lower priority than other things, and I never quite finished it.
* Organized the plugin better. I maybe could have better thought out which properties and methods should be public and which ones should be private.
* Added a timer that shows how long the user was playing.
* Tested it on more devices and browsers. I did not get a chance to test it on Android until late in the project, and I did not get a chance to test it in any version of Internet Explorer earlier than IE 11.


Here is where I got some of my resources from:
* The background is from http://subtlepatterns.com/handmade-paper/.
* I got the idea of using an algorithmic solver to generate a puzzle from http://zhangroup.aporc.org/images/files/Paper_3485.pdf.
* I got the ideas for the solver itself from http://norvig.com/sudoku.html.
* I got the handwriting font from http://fonts.simplythebest.net/fonts/Kids_Scrawl.html.
* I got the icon from http://www.iconarchive.com/show/oxygen-icons-by-oxygen-icons.org/Apps-ksudoku-icon.html.
