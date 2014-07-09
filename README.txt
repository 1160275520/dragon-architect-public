
How to build
=============================================================================

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

