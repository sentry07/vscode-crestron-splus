# AutoComplete Rules

Note:  All Keywords to be provided with the users preference on keyword casing:  UPPERCASE, lowercase,  PascalCase (Pascal_Case) .  (internally all keywords are stored in PascalCase (Pascal_Case) format)

## Possible Program Elements:
Name: TheCurrentDocument (SIMPL+ Document)
Kind: Class
nameRange: 0,0 - 0,0
dataType: Class
blockRange: The whole Document
internalEvents: RootEvents
internalFunctions: RootFunctions
internalVariables: RootVariables
internalConstants: (Add): RootConstants
internalStructures: (Add): RootStructures
uri: (Add): Add URI (to be used with go to definition )

Name: SIMPL+Library
Kind: Class
nameRange: 0,0-0,0
dataType: Class
blockRange: The Whole Document
internalFunctions: RootFunctions
internalConstants: RootConstants
internalStructures: RootStructures
uri: (Add): Add URI (to be used with go to definition )

Name: SIMPL# Class
Kind: Class
nameRange: rangeInsideAPI
dataType: Class
blockRange: ClassRange inside API
internalDelegates?: classDelegates;
internalEvents?: eventDelegates;
internalFunctions?: classFunctions;
internalVariables?: classVariables;
internalProperties?: classProperties;
internalDelegateProperties?: classDelegateProperties;

name: SIMP# Enum
Kind: Enums
nameRange: rangeInsideApi
dataType: Enum
blockRange: ClassRange inside API
internalVariables: enumMembers


## When in the Global Area 
(not inside a function, or an event driver) and:
* The cursor is at the beginning of a line
    * All Declarations
    * Keywords
        * InputType Keyword
            * Digital_Input
            * Analog_Input
            * String_Input
            * Buffer_Input
        * OutputType Keyword
            * Digital_Output
            * Analog_Output
            * String_Output
            * Buffer_Output
        * ParameterType Keywords
            * Integer_Parameter
            * Signed_integer_Parameter
            * Long_integer_Parameter
            * Signed_long_integer_Parameter
            * String_Parameter
        * Variable Storage Modifiers (and then Variable Types after space)
            * Volatile
            * NonVolatile
            * Dynamic
            * Ascii
            * Utf16
            * Inherit
            * DelegateProperty
        * VariableType Keywords
            * Integer
            * Signed_integer
            * Long_integer
            * Signed_long_integer
            * String
        * Built-In structures
            * Tcp_Client
            * Tcp_Server
            * Udp_Socket
        * Structure Keyword
            * Structure
        * Function Storage Modifier (and then Function Keywords after space)
            * CallBack
        * FunctionType Keywords
            * Function
            * Integer_Function
            * Signed_integer_Function
            * Long_integer_Function
            * Signed_long_integer_Function
            * String_Function
        * Event Handler Keywords
            * EventHandler
            * GatherEventHandler
        * Event Storage Modifier (and then Event Keywords after space)
            * ThreadSafe
        * EventType Keywords
            * Push
            * Event
            * Change
            * Release
            * SocketConnect
            * SocketDisconnect
            * SocketReceive
            * SocketStatus
    * Current Document
        * Don't Show Document Variables
        * Don't Show Document Constants
        * Don't Show Document Structures
        * Don't Show Document Functions
    * SIMPL+ Library
        * Don't Show SIMPL+ Library Constants
        * Don't Show SIMPL+ Library Structures
        * Don't Show SIMPL+ Library Functions
    * SIMPL# API
        * Classes
        * Enums

* After user press space after the following Keyword Groups: 
    * Variable Storage Modifiers
        * VariableType Keywords
    * Function Storage Modifier
        * FunctionType Keywords
    * Event Storage Modifier
        * EventType Keywords
* All Other Keywords, don't provide any auto-complete suggestions

* When Inside a Parenthesized-Parameter-List
    * After a Parenthesis or a Comma
        * Parameter Keyword modifier (and then Parameter Keywords after space)
        * Keyword Type
    * If function is RegisterDelegate provide
        * first Parameter: All APIs Static Classes, All Program Instance Classes
        * Second Parameter: All Static Class, or Instance Class, Variables filtered by delegateProperty modifier
        * Third Parameter: nothing (eventual todo: provide functions with the same signature as the second parameter, or provide squigly line to create a placeholder)
    * If function is RegisterEvent
        * first Parameter: All APIs Static Classes, All Program Instance Classes
        * Second Parameter: All Static Class, or Instance Class, events filtered by eventhandler modifier
        * Third Parameter: nothing (eventual todo: provide functions with the same signature as the second parameter, or provide squigly line to create a placeholder)

## When Inside a Structure Block
* Variable Storage Modifiers (and then Variable Types after space)
* VariableType Keywords
* Other custom structures
* Other Classes
* Other Enums



## When inside a Function Block
* The cursor is at the beginning of a line
    * Variable Storage Modifiers (and then Variable Types after space)
    * VariableType Keywords
    * Other custom structures
        * Then after pressing dot, provide structure members and recurse down the structure for each dot
    * Other Classes
        * Then after pressing dot, provide void Functions and Variables and recurse down the class for each dot
    * Other Enums
    * Built-In Void Functions
    * Custom Void Function Names
    * Provide Looping Construct keywords
        * For
        * While
        * Do
    * Provide local function declaration keyword
        * Wait
    * Provide Branching and decision keywords
        * If
        * Else
        * switch and then add case and default while inside switch
        * cswitch and then add case and default while inside switch
    * provide flow control keywords
        * Break
        * Continue
        * Return
    * Current Document
        * Show Document Variables
        * Show Document Constants
        * Show Document Structures
        * Show Document Functions
    * SIMPL+ Library
        * Show SIMPL+ Library Constants
        * Show SIMPL+ Library Structures
        * Show SIMPL+ Library Functions
    * User Defined Classes From the SIMPL# APIs
    * User Defined Enums From the SIMPL# APIs

* The cursor is at the right side after an assignment operand
    * Built-In non-void Functions
    * Custom Non-Void Function Names
    * Custom Class Names
        * Then after pressing dot, provide Non Void Functions and Variables and recurse down the class for each dot
    * Custom Structure Names
        * Then after pressing dot, provide structure members and recurse down the structure for each dot

```csharp
private class()
```