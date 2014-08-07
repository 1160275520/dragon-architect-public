
import sys
import argparse
import gevent.monkey
from gevent.wsgi import WSGIServer
from . import app

PORT=5000

def _go(args):
    app.setup()

    if args.mode == 'dev':
        print("Starting development server...")
        app.app.config['DEBUG'] = True
        app.app.run(port=PORT)
    elif args.mode == 'prd':
        print("Starting production server...")
        gevent.monkey.patch_all()
        http_server = WSGIServer(('', PORT), app.app)
        http_server.serve_forever()
    else:
        sys.stderr.write("Invalid mode %s, aborting.\n" % args.mode)
        sys.exit(1)

def main():

    _desc = '''
    Run the ruthefjord web server.
    '''
    parser = argparse.ArgumentParser(description=_desc)

    mut = parser.add_mutually_exclusive_group()
    mut.add_argument('-d', action='store_const', dest='mode', const='dev', default='dev',
        help="Run in development mode. Will use flask's built-in auto-reloading web server"
    )
    mut.add_argument('-p', action='store_const', dest='mode', const='prd',
        help="Run in production mode. Will use an actual web server like tornado."
    )

    _go(parser.parse_args())

