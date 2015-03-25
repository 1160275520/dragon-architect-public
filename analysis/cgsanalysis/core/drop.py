# Python 3.4+
from sqlalchemy import create_engine, MetaData
from cgsanalysis import cli
from . import schema as ct
import argparse

def main(args):
    engine = cli.create_dst_engine(args)
    ct.metadata.bind = engine

    dodrop = {t.name : t for t in ct.player_tables}
    for v in ct.player_views:
        try:
            v._reflect()
            v.drop(engine, checkfirst=True)
        except: pass

    meta = MetaData()
    meta.reflect(bind=engine)

    for table in reversed(meta.sorted_tables):
        if table.name in dodrop:
            dodrop[table.name].drop(engine, checkfirst=True)

def get_parser():
    _DESC = 'Drops all tables in the target database except for spec and transfered tables. Use this to "reset" the database if more data is added to the logging tables.'
    parser = argparse.ArgumentParser(description=_DESC, parents=[cli.single_engine_parser], add_help=False)
    parser.set_defaults(func=main)
    return parser

