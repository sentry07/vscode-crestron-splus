This is a language package for programming Crestron SIMPL+ module. It has syntax highlighting, document formatting,
snippets for a lot of S+ functions and code blocks, build tasks to compile your code, and a shortcut for the S+ help file.
After installing the extension, please open your VSCode Settings (CTRL-Comma) and search for Splus and verify/update the
file locations in there.

## Use CTRL+SHIFT+B to compile your S+ code
# You must enable or disable the platforms you wish to compile for in the settings. By default only 3 series is enabled.

This extension currently requires that VSCode has opened the containing folder the S+ file(s) are in. As of 0.4.2, the extension will open the folder for you when open a single file, but only if VSCode doesn't have another folder open. If you are getting `No build errors found` messages when building S+ files, make sure you have the opened the containing folder.

## 0.4.2
+ When opening a single file, VSCode will now open the containing folder to enable build tasks
* Fixed build bug when PowerShell is the default shell
* Fixed document formatter adding a blank line to the ends of files

## 0.4.1
* Continued syntax refinement (by bitm0de)
* Code cleanup and rework

## New in 0.4.0
* Lots of updates to syntaxes
+ API file generation for SIMPL# libraries added to build tasks (CTRL+SHIFT+B)

## New in 0.3.0:
* Fixed helpfile shortcut
* Added online help shortcut to context menu (or CTRL+SHIFT+F2)

## Required Extensions (installed automatically)
+ Browser Preview (auchenberg.vscode-browser-preview)

## Quality of life recommendations:
* Install "Open In Application" extension by Fabio Spampinato: https://marketplace.visualstudio.com/items?itemName=fabiospampinato.vscode-open-in-application
* Install "Bracket Pair Colorizer 2" by CoenraadS: https://marketplace.visualstudio.com/items?itemName=CoenraadS.bracket-pair-colorizer-2
* Use a different theme than the default themes for full syntax highlighting (One Dark Pro is amazing)

## Extension Commands

This extension contributes the following commands:

* `splus.localHelp`: Opens the local SIMPL+ help reference file
* `splus.webHelp`: Opens the online SIMPL+ help reference page

## Extension Settings

This extension contributes the following settings:

* `splus.compilerLocation`: sets the path of the SIMPL+ compiler
* `splus.helpLocation`: sets the path of the SIMPL+ help file
* `splus.enable2series`: enables 2 series platform for build targets
* `splus.enable3series`: enables 3 series platform for build targets
* `splus.enable4series`: enables 4 series platform for build targets

## Keybindings and Menus

All commands are added to the right click context menu of the editor tab, and the following keybindings have been added.

* `ctrl+shift+F1`: Opens the local SIMPL+ help reference file
* `ctrl+shift+F2`: Opens the online SIMPL+ help reference page
