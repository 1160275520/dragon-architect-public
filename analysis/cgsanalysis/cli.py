"""Helper functions and common argparse parameters and descriptions for command-line programs that do data transfers.
"""

from __future__ import absolute_import, print_function, unicode_literals
from sqlalchemy import create_engine
from . import dbinfo
import getpass
import argparse
import os

_CGS_ANALYSIS_DB_ENVVAR = 'CGS_ANALYSIS_DB'

def _create_single_engine_parser():
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('-e', '--engine', dest='dstdb', help="Specify the analysis database URL (e.g, mysql://user:pass@host/db). Can alternatively use the %s environment varaible." % _CGS_ANALYSIS_DB_ENVVAR)
    parser.add_argument('-v', '--verbose', action='store_true', dest='is_verbose', help="If set, SQL commands will be echoed to stdout.")
    return parser

single_engine_parser = _create_single_engine_parser()
"""Arg parser to be used as parent for any parser that takes one database as argument. Use create_single_engine to process args"""

def _create_srcdst_engine_parser():
    parser = argparse.ArgumentParser(add_help=False, parents=[single_engine_parser])

    db_mut = parser.add_mutually_exclusive_group()
    db_mut.add_argument('-R', '--replica', dest='srcdb', action='store_const', const=dbinfo.dbreplica, default=dbinfo.dbreplica, help="Use the replica database as the source (default).")
    db_mut.add_argument('-D', '--dev', dest='srcdb', action='store_const', const=dbinfo.dbdev, help="Use the developement database as the source.")
    db_mut.add_argument('-P', '--prd', dest='srcdb', action='store_const', const=dbinfo.dbprd, help="Use the production database as the source (don't do this unless replica is not working).")

    return parser

srcdst_engine_parser = _create_srcdst_engine_parser()
"""Arg parser to be used as parent for any parser that takes two databases as arguments, where the first may be a standard CGS database. Use create_srcdst_engines to process args"""

def create_dst_engine(args):
    """Given the parsed args from a parser with parent single_engine_parser or srcdst_engine_parser, creates the destination db engine"""

    # if not specified on command line, try environment variable
    if args.dstdb is not None:
        db = args.dstdb
    elif _CGS_ANALYSIS_DB_ENVVAR in os.environ:
        db = os.environ[_CGS_ANALYSIS_DB_ENVVAR]
    else:
        raise ValueError('no engine specified and environment variable not set.')

    return create_engine(db, echo=args.is_verbose)

def create_src_engine(args, dbname):
    """Given the parsed args from a parser with parent srcdst_engine_parser and a db name, creates the source db engine"""
    srcdb = args.srcdb.url(dbname)
    return create_engine(srcdb, echo=args.is_verbose, pool_recycle=3600)

