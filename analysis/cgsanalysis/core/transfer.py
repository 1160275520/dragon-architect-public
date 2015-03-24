from __future__ import absolute_import, print_function, unicode_literals
from sqlalchemy import create_engine, Table, MetaData, Column, String, ForeignKey
from sqlalchemy.sql import select, union, or_, and_, func
from sqlalchemy.schema import ForeignKeyConstraint
from sqlalchemy.dialects.mysql import TINYINT
from sqlalchemy.types import Boolean
from . import schema as ct
from cgsanalysis.sql import (
    create_temp_table_as_select_pkey,
    create_temp_table_as_select_fkey,
    get_fk_type
)
from cgsanalysis import cli, gameinfo
from contextlib import closing
import getpass
import sys
import argparse
from collections import defaultdict

def fill_uid_table_by_cids(connection, metadata, log_tables, cids, banned_uids):
    """Creates a temporary table with the single column 'uid' that is the set of
    all users that have a pageload for any of the given cids.
    Cids should be a list of tuples (cid, start, end) where:
        cid is an integer category id
        start is a integer unix timestamp or None
        end is a integer unix timestamp or None
    Users are inserted if they have pageloads that occur within [start, end] for a cid.

    Returns the temporary uid table.
    """
    pageload = log_tables[ct.log_pageload].src_table
    if len(cids) == 0:
        raise ValueError('cid list must be nonempty')

    ts = pageload.c.log_ts

    # create list of lists that is a disjunction of conjunctions for the conditions
    conditions = [[pageload.c.cid == cid] + ([] if start is None else [ts >= start]) + ([] if end is None else [ts <= end]) for cid, start, end in cids]
    # then select relevant users
    sel = select([pageload.c.uid]).where(pageload.c.uid.notin_(banned_uids)).where(or_(*[and_(*clauses) for clauses in conditions])).distinct()
    # and make a temp uid table with those users
    return create_temp_table_as_select_fkey(connection, metadata, 'tmp_uid', pageload.c.uid, sel)

def fill_uid_table_by_uids(connection, metadata, uids):
    uid_table = Table('uid_table', metadata, Column('uid', ct.type_uid, primary_key=True), prefixes=['TEMPORARY'])
    uid_table.create(connection)
    uids = [{'uid':u} for u in uids]
    connection.execute(uid_table.insert(), uids)
    return uid_table

def copy_tables_by_id(src_conn, dst_conn, table_info, batch_size):
    """Migrates tables from src_conn to dst_conn, first joining with index tables to select only a subset of rows
    tables should be an iterable of tuples containing the following elements:
    (data_table, index_table)
    """
    for logging_table, index_table in table_info:
        # read rows batch_size at a time and perform bulk inserts into the destination db
        data_table = logging_table.src_table
        query = select([data_table]).select_from(index_table.join(data_table))

        with closing(src_conn.execute(query)) as cursor:
            while True:
                rows = cursor.fetchmany(batch_size)
                if len(rows) == 0:
                    break
                dst_conn.execute(logging_table.dst_table.insert(), rows)

def fill_logging_id_tables(src_conn, dst_conn, log_tables, uid_table, is_multiplayer=False):
    """Creates a temporary id table for each of pageloads, quests, and actions
    that contains the primary keys of the normal tables' data that is relevant
    for the uids in the given uid table. Returns a list of table info consumable
    by copy_tables_by_id.

    uid_table should have a single column named 'uid'.
    All data for these users will be dumped.
    Usually created via create_uid_table_by_cids or create_uid_table_by_uids.
    """
    pageload    = log_tables[ct.log_pageload].src_table
    dquest      = log_tables[ct.log_quest].src_table
    action      = log_tables[ct.log_action].src_table
    condition   = log_tables[ct.ab_condition].src_table

    metadata = pageload.metadata

    def _get_max_pkey(table_name):
        table = log_tables[table_name].dst_table
        pkeys = table.primary_key.columns.values()
        if len(pkeys) != 1: raise ValueError('requires exactly 1 primary key')
        return dst_conn.execute(select([func.max(pkeys[0])])).scalar()

    max_pageload =  _get_max_pkey(ct.log_pageload)
    max_quest =     _get_max_pkey(ct.log_quest)
    max_action =    _get_max_pkey(ct.log_action)
    max_condition = _get_max_pkey(ct.ab_condition)
    max_condition = 0 if max_condition is None else max_condition

    # XXX cannot yet filter pageloads/quests by max ids because there may be additional quests/actions from old ones.
    # CAN filter actions by max action though, since there is not joining to be done on them.
    # There is some potential optimizations here if the system can efficiently determine (from dst tables)
    # which quests are "finished" and not bother adding those to the tmp quests table

    tmp_pageload_id = create_temp_table_as_select_fkey(src_conn, metadata, 'tmp_pageload_id', pageload.c.log_pl_id,
        select([pageload.c.log_pl_id]).where(pageload.c.uid == uid_table.c.uid)
    )

    # XXX this max thing is probably suuuper wrong, need to figure better way to only fetch new data
    tmp_condition_id = create_temp_table_as_select_fkey(src_conn, metadata, 'tmp_condition_id', condition.c.id,
        select([condition.c.id]).where(condition.c.cgs_uid == uid_table.c.uid).where(condition.c.id > max_condition)
    )


    if is_multiplayer:
        # have to use 3 temp tables because MySQL sucks and only lets you refernce a temp table once per query

        # first grab all "child" dqids
        tmp_child_id = create_temp_table_as_select_fkey(src_conn, metadata, 'tmp_child_id', dquest.c.log_q_id,
            select([dquest.c.log_q_id]).where(dquest.c.uid == uid_table.c.uid)
        )
        # then get the parent ids
        child = dquest.alias()
        parent = dquest.alias()
        tmp_parent_id = create_temp_table_as_select_fkey(src_conn, metadata, 'tmp_parent_id', dquest.c.log_q_id,
            select([parent.c.log_q_id]).select_from(tmp_child_id.join(child).join(parent, child.c.parent_dqid == parent.c.dqid)).distinct()
        )
        # then smash them together
        tmp_quest_id = create_temp_table_as_select_fkey(src_conn, metadata, 'tmp_quest_id', dquest.c.log_q_id,
            union(select([tmp_child_id]), select([tmp_parent_id]))
        )

    else:
        tmp_quest_id = create_temp_table_as_select_fkey(src_conn, metadata, 'tmp_quest_id', dquest.c.log_q_id,
            select([dquest.c.log_q_id]).where(dquest.c.uid == uid_table.c.uid)
        )

    tmp_dqid = create_temp_table_as_select_pkey(src_conn, metadata, 'tmp_dqid', dquest.c.dqid,
        select([dquest.c.dqid]).select_from(tmp_quest_id.join(dquest)).where(dquest.c.dqid != None).distinct(),
    )

    # then select actions by those dqids
    action_sel = select([action.c.log_id]).where(action.c.dqid == tmp_dqid.c.dqid)
    # restrict ourselves to only the new actions if possible
    if max_action is not None:
        action_sel = action_sel.where(action.c.log_id > max_action)
    tmp_action_id = create_temp_table_as_select_fkey(src_conn, metadata, 'tmp_action_id', action.c.log_id, action_sel)

    # now that all the joins are done, can delete older ids
    # but since no delete access, actually need to create _more_ temp tables
    if max_pageload is not None:
        tmp_pageload_id = create_temp_table_as_select_fkey(src_conn, metadata, 'filtered_tmp_pageload_id', pageload.c.log_pl_id,
            select([tmp_pageload_id]).where(tmp_pageload_id.c.log_pl_id > max_pageload)
        )
    if max_quest is not None:
        tmp_quest_id = create_temp_table_as_select_fkey(src_conn, metadata, 'filtered_tmp_quest_id', dquest.c.log_q_id,
            select([tmp_quest_id]).where(tmp_quest_id.c.log_q_id > max_quest)
        )

    return [
        (log_tables[ct.log_pageload], tmp_pageload_id),
        (log_tables[ct.log_quest],    tmp_quest_id),
        (log_tables[ct.log_action],   tmp_action_id),
        (log_tables[ct.ab_condition], tmp_condition_id),
    ]

def transfer_logging_by_cid(args, dst_engine, dst_conn, game, rowset, banned_uids):
    metadata = MetaData()
    src_engine = cli.create_src_engine(args, game.db_log)
    metadata.bind = src_engine

    with src_engine.connect() as src_conn:
        log_tables = ct.load_logging_tables_from_remote(src_conn, metadata, game.name)

        cids = [(row.cid, row.start, row.end) for row in rowset]
        uid_table = fill_uid_table_by_cids(src_conn, metadata, log_tables, cids, banned_uids)

        for t in log_tables.values():
            t.create_local(dst_conn)

        table_info = fill_logging_id_tables(src_conn, dst_conn, log_tables, uid_table, is_multiplayer=bool(row.is_multiplayer))
        copy_tables_by_id(src_conn, dst_conn, table_info, args.copy_batch_size)

def main(args):

    dst_engine = cli.create_dst_engine(args)
    ct.metadata.bind = dst_engine

    with dst_engine.connect() as dst_conn:

        # first figure out which cids/games/uids we need based on database settings
        spec_cid = dst_conn.execute(select([ct.spec_category])).fetchall()
        spec_banned_uid = dst_conn.execute(select([ct.spec_banned_user])).fetchall()

        # group them by gid to do all for a single game at once
        gids = defaultdict(list)
        for row in spec_cid:
            gids[row.gid].append(row)

        banned_uids = [r.uid for r in spec_banned_uid]

        # for each row, fetch the logging data, then fetch the ab test data
        for gid, rowset in gids.items():
            game = gameinfo.games_by_gid()[gid]
            transfer_logging_by_cid(args, dst_engine, dst_conn, game, rowset, banned_uids)

def get_parser():
    _DESC = """
    Transfer rows of the pageloads/quests/actions tables from the remote logging database to a local one.
    Uses the spec_* tables to determine what to transfer, so run specify.py first.

    The program will only transfer new data, so this can be run frequently and cheaply to collect newer data.
    """

    parser = argparse.ArgumentParser(parents=[cli.srcdst_engine_parser], description=_DESC, add_help=False)
    parser.set_defaults(func=main)

    # the default number of rows to inset at a time in copy tables
    # the default max packet size on ubuntu MySQL is 16MB O_o so have to do this in super tiny chunks to be safe
    DEFAULT_BATCH_SIZE = 1000
    parser.add_argument('-b', '--batch-size', dest='copy_batch_size', type=int, required=False, default=DEFAULT_BATCH_SIZE,
        help="The max number of rows to insert at a time when copying tables. Default is %s to handle default MySQL configurations with low maximum packet sizes. Set this as high as possible for better performance." % DEFAULT_BATCH_SIZE
    )

    return parser

