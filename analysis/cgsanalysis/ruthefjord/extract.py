
import argparse
from cgsanalysis import cli
from cgsanalysis.core import schema as ct


def process_non_trace_actions():
    '''process all non-trace actions, generating new data related to:
    tos consent, experimental conditions, player id, etc.'''

    # iterate over the set of all non-trace actions


def main(args):
    pass

def get_parser():
    _DESC = 'Extract ruthefjord-specific action data'
    parser = argparse.ArgumentParser(description=_DESC, parents=[cli.single_engine_parser], add_help=False)
    parser.set_defaults(func=main)
    return parser

