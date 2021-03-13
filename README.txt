
Contents:
============================================================================
- How to Build
- Project Layout and Descriptions

How to build
============================================================================

Requries Windows (64-bit) or Mac OSX.
64-bit because I was lazy and hard-coded paths to "C:\Program Files (x86)".

Dependencies:
- either Visual Studio 2013 or MonoDevelop 5 (aka Xamarin Studio)
- python 2.7+ (does NOT work with 3.X)
- nodejs + npm + gulp

The project also depends on some other repositories, but it will clone
them during the build process. Beware: these will be cloned into the
parent directory of this project! If the remote URLs for these
dependencies have rotted away, you can override the remote URLs by
creating a dependency_override.json in this directory. See tools/depman.py
for information about how to do this.

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
    Build script and dependency info to clone/build our fork of blockly.
- build:
    The final output directory. Static html will be in here after a build.
- doc:
    Miscellaneous documentation for the project.
- gamelib (buildable): DEPRECATED
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

- dragon model:
    We cannot distribute the dragon model. In order to see the dragon model, you need to purchase it at https://www.turbosquid.com/3d-models/3d-dragon-cartoon-model-1500561

