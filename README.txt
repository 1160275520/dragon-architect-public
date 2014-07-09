

Contents:
============================================================================
- How to Build
- Project Layout and Descriptions

How to build
============================================================================

Requries Windows (64-bit) or Mac OSX, because Unity.
64-bit because I was lazy and hard-coded paths to "C:\Program Files (x86)".

Dependencies:
- either Visual Studio 2012 or MonoDevelop 5 (aka Xamarin Studio)
- Unity 4.5 (with Pro License)
- python 2.7+ (does NOT work with 3.X)
- nodejs + npm + gulp

Assuming all the dependencies are installed and python/node are on the PATH,
run `python build.py` from the project root. This will build everything,
and dump the deployble web code in build/.

python build.py can also build individual components by passing in the name.
All buildable projects place their output directly in the folder where its
dependent project needs it to be.

Project Layout and Descriptions
============================================================================

Descriptions of each of the directories in the main project.
All buildable components (labled "buildable" below) can be build with
`python build.py <folder name>`.

- blockly (buildable):
    Our fork of blockly, with some minor tweaks and code changes.
    Also include closure to make the build self-contained.
- build:
    The final output directory. Static html will be in here after a build.
- doc:
    Miscellaneous documentation for the project.
- gamelib (buildable):
    The code for the .NET library that contains most of the system logic.
    Also contains some unit tests and utility projects.
- html (buildable):
    The html/js/css front end application.
    During development, this can be run directly by loading html/index.html.
    Building the project places a minified/optimized version in build/.
    Requires 'blockly' and 'unity'.
- server:
    The server backend, for the game to communicate with a database and
    proxy telemetry requests, among other things.
- unity (buildable):
    The Unity project.
    Requires 'gamelib'.

