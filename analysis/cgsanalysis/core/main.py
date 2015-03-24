
import argparse
from . import specify, transfer, clean, drop

def main():
    _DESC='''Core cgsanalysis database operations.
    '''

    parser = argparse.ArgumentParser(description=_DESC)
    subprs = parser.add_subparsers(description="")

    specify.make_subparsers(subprs)
    subprs.add_parser('transfer', parents=[transfer.get_parser()], help='Copy tables from AWS servers.')
    subprs.add_parser('clean', parents=[clean.get_parser()], help='Create the cleaned player/session/trace/action tables.')
    subprs.add_parser('drop', parents=[drop.get_parser()], help='Drop all generated tables.')

    args = parser.parse_args()
    args.func(args)

