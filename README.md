This is a language package for programming Crestron SIMPL+ module. It has syntax highlighting, document formatting,
snippets for a lot of S+ functions and code blocks, build tasks to compile your code, and a shortcut for the S+ help file.
After installing the extension, please open your VSCode Settings (CTRL-Comma) and search for Splus and verify/update the
file locations in there.

## Use CTRL+SHIFT+B to compile your S+ code
# You must enable or disable the platforms you wish to compile for in the settings.
# By default only 3 series is enabled.

## New in this release (0.3.0):
* Fixed helpfile shortcut
* Added online help shortcut

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
