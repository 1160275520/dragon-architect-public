
Source is in hackcraftserver (which is also the package name).

To get running on a linux system:

Execute the following commands
virtualenv venv
source venv/bin/activate
pip install -r requirements.txt
./bin/initialize
./bin/runserver

Implementation notes:
Uses SQLAlchmey and Flask (with Flask-SQLAlchemy to makes things easy).
I don't expect this to scale very well, but it IS super small and easy to slap together,
so it'll be great until we run into perf problems or need silly things like authentication.

