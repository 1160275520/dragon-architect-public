from __future__ import absolute_import, print_function, unicode_literals
from sqlalchemy import create_engine, MetaData, Table, String, Integer, ForeignKey, ForeignKeyConstraint
from sqlalchemy.engine import reflection
from sqlalchemy.dialects.mysql import TINYINT
from . import base
from cgsanalysis import gameinfo

# some type constants from the logging tables
type_uid = String(36) # assumes UUID, may not hold for older datasets
type_username = String(60)
type_timestamp = Integer

class LoggingTable(object):
    """Wrapper object for logging tables, since have 2 sqlalchemy.Table objects: one for the remote db and one for the local db.
    Can load the schema from either source, and can create the local table based on the loaded remote one.
    """

    def __init__(self, dbprefix, tablename):
        self.tablename = tablename
        self.dbprefix = dbprefix
        self.src_table = None
        self.dst_table = None

    def load_schema_from_remote(self, src_conn, metadata, gamename):
        game = gameinfo.games_by_name()[gamename]
        schema = game.dbs[self.dbprefix]
        self.src_table = Table(self.tablename, metadata, schema=schema, autoload=True, autoload_with=src_conn)

    def load_schema_from_local(self, dst_conn):
        self.dst_table = Table('orig_' + self.tablename, base.metadata, autoload=True, autoload_with=dst_conn)

    def create_local(self, dst_conn):
        """Create a local version of the remote table. Must call load_schema_from_remote first.
        Takes care of all the necessary tweaks (e.g., table renaming, dropping unused FKCs) so that the local table actually works.
        """
        if self.src_table is None:
            raise RuntimeError('cannot create local logging table, source table not yet loaded!')

        table = self.src_table.tometadata(base.metadata, None)
        table.name = 'orig_' + table.name

        self.dst_table = table

        if dst_conn.engine.name != 'mysql':
            # first mess with the index names to avoid index name collisions on certain DMBSes.
            for idx in table.indexes:
                idx.name = table.name + "__idx_" + idx.name
            # then also fudge any tinyints to booleans
            # XXX assumes all tinyints are booleans
            for col in table.c:
                if isinstance(col.type, TINYINT):
                    col.type = Boolean()
        # then additionally drop any fk constraints since we might not be copying over those tables
        fks = set([c for c in table.constraints if isinstance(c, ForeignKeyConstraint)])
        table.constraints = table.constraints - fks

        table.create(dst_conn, checkfirst=True)


# tables from prd.db....

log_pageload    = ('log',  'player_pageload_log',          'log_pl_id')
log_quest       = ('log',  'player_quests_log',            'log_q_id')
log_action      = ('log',  'player_actions_log',           'log_id')
log_nq_action   = ('log',  'player_actions_no_quests_log', 'log_no_quest_id')
ab_condition    = ('ab',   'user_conditions_ab',           'id')

logging_table_names = [
    log_pageload,
    log_quest,
    log_action,
    ab_condition,
]

def _pk_of(table_def):
    return table_def[2]

def _fk_of(table_def):
    return ForeignKey('orig_%s.%s' % (table_def[1], table_def[2]))

def load_logging_tables_from_remote(src_conn, metadata, gamename):
    tables = { t : LoggingTable(t[0], t[1]) for t in logging_table_names }
    for t in tables.values(): t.load_schema_from_remote(src_conn, metadata, gamename)
    return tables

def load_logging_tables_from_local(dst_conn):
    tables = { t : LoggingTable(t[0], t[1]) for t in logging_table_names }
    for t in tables.values(): t.load_schema_from_local(dst_conn)
    return tables

# tables from state.db....

state_members   = ('master', 'cgs_members')
state_tosaccept = ('master', 'user_tos_acceptance')

state_tables = [
    state_members,
    state_tosaccept,
]

