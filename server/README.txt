
Source is in ruthefjordserver (which is also the package name).

To get running on a linux system:

Install the following software:
- python 3.4+ with virtualenv
- postgresql (with development files)
    - create a 'ruthefjord' database
    - user must have privileges on localhost:ruthefjord

Execute the following commands
virtualenv -p /usr/bin/python3.4 venv
source venv/bin/activate
pip install -r requirements.txt
./bin/initialize
./bin/runserver -p

Implementation notes:
Uses SQLAlchmey and Flask (with Flask-SQLAlchemy to makes things easy).
I don't expect this to scale very well, but it IS super small and easy to slap together,
so it'll be great until we run into perf problems or need silly things like authentication.

