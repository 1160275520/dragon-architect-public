# Python 3.4+
import argparse
from . import extract
from cgsanalysis.core import main as core_main

def main():
    _DESC='''Ruthefjord database operations.
    '''

    parser = argparse.ArgumentParser(description=_DESC, parents=[core_main.parser])
    subprs = core_main.subprs
    subprs.add_parser('extract', parents=[extract.get_parser()], help='Extract rutehfjord-specific data/actions.')
    args = parser.parse_args()
    args.func(args)

