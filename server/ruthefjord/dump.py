
from .models import *
import os, sys
from .main import create_app
import argparse
import json

def _go(args):
    app = create_app(args)
    with app.app.app_context():

        def dump_project(j):
            return j.serialize

        def dump_player(p):
            d = p.serialize
            d['projects'] = [dump_project(j) for j in UploadedProject.query.filter_by(author=p.id)]

            return d

        players = [dump_player(p) for p in Player.query]

        print(json.dumps(players, indent=4))

def main():
    _desc = '''
    Dump data.
    '''
    parser = argparse.ArgumentParser(description=_desc)

    _go(parser.parse_args())
