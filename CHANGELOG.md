# Change Log

## 1.0.0
*  Complete language syntax highlighting for SIMPL+ files and API files
*  Document formatting with
    *   Indentation
    *   Capitalization for keywords with options for
        *   lowercase
        *   UPPERCASE
        *   PascalCase
        *   Leave Untouched
    *   Brace Line ( {} ) formatting
        *   Same Line as block name
        *   New line under block name
*  Full support of VS Code Build Task: 
    *   Autodetects workspaces with USP and [suggest relevant SIMPL+ Build Task](https://code.visualstudio.com/docs/editor/tasks#_task-autodetection) 
    *   Create your own [Custom Build task](https://code.visualstudio.com/docs/editor/tasks#_custom-tasks) for one or many SIMPL+ files through VS Code tasks.json
*  Support for building current file using F12, or force build using Shift+F12.
*  Remembers build targets from previously build SIMPL+ files the same way Crestron's SIMPL+ IDE does.
*  Hover over help for SIMPL+ functions, leveraging the SIMPL+ online help file.
*  Automatic API file generation for SIMPL# libraries
*  Autocomplete support for local variables, functions, SIMPL# classes and enums, SIMPL+ library functions, keywords, and built-in functions.
*  Function Signature Helper
*  Snippets for common SIMPL+ functions
*  SIMPL+ category insertion through right click context menu

## 0.5.0
+ Replaced dependency for BrowserPreview extension with internal browser
* Updated dependencies

## 0.4.2
+ When opening a single file, VSCode will now open the containing folder to enable build tasks
* Fixed build bug when PowerShell is the default shell
* Fixed document formatter adding a blank line to the ends of files

## 0.4.1
* Continued syntax refinement (by bitm0de)
* Code cleanup and rework

## 0.4.0
* Lots of updates to syntaxes
+ API file generation for SIMPL# libraries added to build tasks (CTRL+SHIFT+B)

## 0.3.0
* Fixed local helpfile command
+ Added online helpfile shortcut

## 0.2.1
- Lots of syntax updates

## 0.2.0
- First published version
- Added a document formatter provider. Use the context menu to select Format Document. You can also enable "Format on Save" in VSCode settings.
- Build targets in the settings (2, 3 and 4 series). 3 series is the default when installing.
- Updated snippets and language definitions
