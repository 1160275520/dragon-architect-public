from __future__ import absolute_import, print_function, unicode_literals
from sqlalchemy import create_engine, MetaData, String, Integer
from sqlalchemy.schema import Table, Column, ForeignKey, Index
from sqlalchemy.sql import select, func, literal, case, or_, and_
from sqlalchemy.exc import OperationalError
from . import schema as ct
from cgsanalysis import cli
from cgsanalysis.sql import (
    InsertFromSelect,
    get_fk_type,
    create_temp_table_as_select_fkey,
    create_temp_table_as_select,
)
import argparse

def create_log_table_indices(conn, log_tables):
    pageload = log_tables[ct.log_pageload].dst_table
    dquest = log_tables[ct.log_quest].dst_table

    # if these already exist, don't worry about it so just catch the failures

    try:
        Index(pageload.name + "_idx__sessionid", pageload.c.sessionid, unique=True).create()
    except OperationalError: pass
    try:
        Index(dquest.name + "_idx__sessionid", dquest.c.sessionid).create()
    except OperationalError: pass

def create_players_and_sessions(conn, log_tables):
    """Populate player, player_logging, session, session_logging."""
    # XXX really should be using the tmp uid table, not pageloads. want people without pageloads to still show up
    pageload = log_tables[ct.log_pageload].dst_table
    condition = log_tables[ct.ab_condition].dst_table

    with conn.begin() as trans:
        ct.player.create(conn, checkfirst=True)
        # enforce foreign key types
        ct.session.c.log_pageload_id.type = get_fk_type(pageload.c.log_pl_id)
        ct.session.create(conn, checkfirst=True)

        conn.execute(InsertFromSelect(ct.player, ['log_uid'], select([pageload.c.uid]).distinct()))

        # turns out that sometimes the ab table has conflicting entires for the same uid/cid! woo!
        # also turns out that it's not always the first entry that is correct! and sometimes they have the same timestamp!
        # so we apply very strict requirements for clean data: there needs to be EXACLY ONE entry with the exact UID/CID to match
        # first pull out all rows that are not duplicated
        tmp_condition = Table('tmp_user_condition', ct.metadata,
            Column('uid', ct.type_uid, primary_key=True, autoincrement=False),
            Column('cid', Integer, primary_key=True, autoincrement=False),
            Column('cdid', Integer),
            prefixes=['TEMPORARY']
        )
        tmp_condition.create(conn)
        conn.execute(InsertFromSelect(tmp_condition, ['uid', 'cid', 'cdid'],
            select([condition.c.cgs_uid, condition.c.cid, func.min(condition.c.cond_id)]).group_by(condition.c.cgs_uid, condition.c.cid).having(func.count('*') == 1)
        ))

        conn.execute(InsertFromSelect(ct.session, ['log_pageload_id', 'player_id', 'game_id', 'category_id', 'condition_id', 'start_time'],
            select([pageload.c.log_pl_id, ct.player.c.id, pageload.c.gid, pageload.c.cid, tmp_condition.c.cdid, pageload.c.log_ts]).\
                select_from(
                    ct.player.\
                    join(pageload, pageload.c.uid == ct.player.c.log_uid).\
                    outerjoin(tmp_condition, and_(tmp_condition.c.uid == ct.player.c.log_uid, tmp_condition.c.cid == pageload.c.cid))
                )
            )
        )

def create_single_player_traces(conn, log_tables):
    """Populate trace, trace_session, trace_logging, trace_parent_logging
    for single player games. A separate function is required because e.g.,
    refraction does not have the parent_dqid attribute in player_quests_log.
    """
    pageload = log_tables[ct.log_pageload].dst_table
    dquest = log_tables[ct.log_quest].dst_table

    with conn.begin() as trans:
        # enforce foreign key types
        ct.trace.c.log_quest_id.type = get_fk_type(dquest.c.log_q_id)
        ct.trace_session.c.log_quest_id.type = get_fk_type(dquest.c.log_q_id)
        ct.trace.create(checkfirst=True)
        ct.trace_session.create(checkfirst=True)

        # it seems that sometimes a quest start is logged twice with the same data.
        # so first we create a temporary table with just the primary key of dquest so we can remove duplicate dqids
        # we do this by grouping by dqid and arbitrarily choosing the "first" (via MIN) of them as the entry to use
        # q_s_id = 1 for "begin trace," 0 for "end trace," so we only want entires with 1.
        tmp_quest_ids = create_temp_table_as_select_fkey(conn, ct.player.metadata, 'tmp_quest_id', dquest.c.log_q_id,
            select([func.min(dquest.c.log_q_id).label('log_q_id')]).where(dquest.c.q_s_id == 1).where(dquest.c.dqid != None).group_by(dquest.c.dqid)
        )
        # get qids by joining with dquest
        conn.execute(InsertFromSelect(ct.trace, ['log_quest_id', 'quest_id', 'start_time'],
            select([tmp_quest_ids.c.log_q_id, dquest.c.qid, dquest.c.log_q_ts]).select_from(tmp_quest_ids.join(dquest, dquest.c.log_q_id == tmp_quest_ids.c.log_q_id))
        ))
        tmp_quest_ids.drop(conn)

        # then get session a seqids by joining with dquest again
        # for now just drop quests without a session id
        # XXX TODO do something more intelligent than that, perhaps? there are quite a lot of these
        conn.execute(InsertFromSelect(ct.trace_session, ['trace_id', 'session_id', 'log_quest_id', 'session_sequence_index', 'start_time'],
            select([ct.trace.c.id, ct.session.c.id, ct.trace.c.log_quest_id, dquest.c.quest_seqid, ct.trace.c.start_time]).\
                    select_from(ct.trace.join(dquest).join(pageload, pageload.c.sessionid == dquest.c.sessionid).join(ct.session)).\
                    where(dquest.c.sessionid != None)
        ))

def create_multi_player_traces(conn, log_tables):
    """Populate trace, trace_session, trace_logging, trace_parent_logging
    for multiplayer games.
    """
    pageload = log_tables[ct.log_pageload].dst_table
    dquest = log_tables[ct.log_quest].dst_table

    with conn.begin() as trans:
        ct.trace.c.log_quest_id.type = get_fk_type(dquest.c.log_q_id)
        ct.trace_session.c.log_quest_id.type = get_fk_type(dquest.c.log_q_id)
        ct.trace.create(checkfirst=True)
        ct.trace_session.create(checkfirst=True)

        # it seems that sometimes a quest start is logged twice with the same data.
        # so first we create a temporary table with just the primary key of dquest so we can remove duplicate dqids
        # we do this by grouping by dqid and arbitrarily choosing the "first" (via MIN) of them as the entry to use
        # q_s_id = 1 for "begin trace," 0 for "end trace," so we only want entires with 1.
        tmp_quest_ids = create_temp_table_as_select_fkey(conn, ct.player.metadata, 'tmp_quest_id', dquest.c.log_q_id,
            select([func.min(dquest.c.log_q_id).label('log_q_id')]).where(dquest.c.q_s_id == 1).where(dquest.c.dqid != None).group_by(dquest.c.dqid)
        )
        # get qids by joining with dquest
        # also only want "parent dqids" that were started by the server
        # XXX TODO this is actually the WRONG way to do it, because logging errors create client quest logs with NULL dqids. will need to add new row to DB to fix.
        # fortunately, they will not be matched up with users and so will just get marked invalid
        # while we could hard code the server's uid, that is the WRONG way to handle it because it will break for any new games or if that uid changes. we need a new column.
        conn.execute(InsertFromSelect(ct.trace, ['log_quest_id', 'quest_id', 'start_time'],
            select([tmp_quest_ids.c.log_q_id, dquest.c.qid, dquest.c.log_q_ts]).select_from(tmp_quest_ids.join(dquest, dquest.c.log_q_id == tmp_quest_ids.c.log_q_id)).where(dquest.c.parent_dqid == None)
        ))
        # then get session a seqids by joining with dquest twice, need to find traces with the parent_dqid of our dqid
        parentdqid = dquest.alias()
        childdqid = dquest.alias()

        conn.execute(InsertFromSelect(ct.trace_session, ['trace_id', 'session_id', 'log_quest_id', 'session_sequence_index', 'start_time'],
            select([ct.trace.c.id, ct.session.c.id, childdqid.c.log_q_id, childdqid.c.quest_seqid, childdqid.c.log_q_ts]).\
                    select_from(
                        ct.trace.join(parentdqid).\
                        join(childdqid, childdqid.c.parent_dqid == parentdqid.c.dqid).\
                        join(tmp_quest_ids, childdqid.c.log_q_id == tmp_quest_ids.c.log_q_id).\
                        join(pageload, pageload.c.sessionid == childdqid.c.sessionid).\
                        join(ct.session)).\
                    where(childdqid.c.sessionid != None)
        ))

def create_trace_wins_and_actions(conn, log_tables):
    """Populate trace_session.end_type, action, action_logging.
    This currently assumes some single-player semantics for the seq idx.
    """
    dquest = log_tables[ct.log_quest].dst_table
    action = log_tables[ct.log_action].dst_table

    with conn.begin() as trans:
        # to fill the 'wins,' need to fish them out of the quests log where q_s_id = 0.
        # forutnately, there are duplicates here too! time to grab some min ids.
        tmp_quest_dqids = create_temp_table_as_select_fkey(conn, ct.player.metadata, 'tmp_quest_win_dqid', dquest.c.dqid,
            select([dquest.c.dqid]).where(dquest.c.q_s_id == 0).where(dquest.c.dqid != None).distinct()
        )
        if conn.engine.name == 'sqlite':
            # sqlite's update support is limited, so do super irritating temp table shenanigans
            # apparently this doesn't even work with the select nested, have to actually make a temp table >_>
            tmp_win = create_temp_table_as_select(conn, ct.player.metadata, 'tmp_win',
                select([ct.trace_session.c.log_q_id, case([(tmp_quest_dqids.c.dqid != None, literal(1))], else_=literal(None)).label('didwin')]).\
                    select_from(ct.trace_session.join(dquest).outerjoin(tmp_quest_dqids))
            )
            conn.execute(ct.trace_session.update().values(end_type=select([tmp_win.c.didwin]).where(tmp_win.c.log_q_id == ct.trace_session.c.log_q_id)))
        else:
            # do a much more efficient update with join on more featureful DBMSes
            conn.execute(ct.trace_session.update().\
                values(end_type=ct.END_TYPE_COMPLETE).\
                where(ct.trace_session.c.log_quest_id == dquest.c.log_q_id).\
                where(tmp_quest_dqids.c.dqid == dquest.c.dqid)
            )

        # enforce foreign key types
        ct.action.c.log_action_id.type = get_fk_type(action.c.log_id)
        ct.action.create(checkfirst=True)
        ct.start_action.create(checkfirst=True)

        # since a good chunk of quest starts are missing, need to join with that to ignore orphaned quest actions
        # TODO: do something more sophisticated like fish dqids out of actions to avoid missing dqids

        # first we need to make up a start action to ensure every trace has at least one action
        # logging system starts seqid at 1 because the trace start is the "0th" seqid
        conn.execute(InsertFromSelect(ct.action, ['trace_id', 'trace_sequence_index', 'time'],
            select([ct.trace.c.id, literal(0), literal(0)]).select_from(ct.trace.join(dquest))
        ))
        conn.execute(InsertFromSelect(ct.start_action, ['id'], select([ct.action.c.id])))
        # then add the other actions
        # duplicates! duplicates everywhere!
        # unique key for actions is dqid, qaction_seqid
        # HACK need to discard actions where seqid is 0 to avoid clashing with the fabricated start actions. will need to deal with this for older data
        tmp_action_ids = create_temp_table_as_select_fkey(conn, ct.player.metadata, 'tmp_action_id', action.c.log_id,
            select([func.min(action.c.log_id).label('log_id')]).where(action.c.qaction_seqid != 0).group_by(action.c.dqid, action.c.qaction_seqid)
        )

        conn.execute(InsertFromSelect(ct.action, ['log_action_id', 'trace_id', 'trace_sequence_index', 'time'],
            select([action.c.log_id, ct.trace.c.id, action.c.qaction_seqid, action.c.ts]).\
                select_from(ct.trace.join(dquest).join(action, action.c.dqid == dquest.c.dqid).join(tmp_action_ids))
        ))

def create_single_player_action_player(conn, log_tables):
    # in single player, all actions are attributed to the only player
    # TODO: this is the incomplete but efficient way to do this.
    # it will leave actions in traces without a sesion orphaned, but the alternative way won't use indices for the joins. can probably fix that.
    with conn.begin() as trans:
        ct.action_player.create(checkfirst=True)
        conn.execute(InsertFromSelect(ct.action_player, ['action_id', 'player_id'],
            select([ct.action.c.id, ct.session.c.player_id]).\
                select_from(ct.action.join(ct.trace).join(ct.trace_session).join(ct.session))
        ))

def create_multi_player_action_player(conn, log_tables):
    action = log_tables[ct.log_actions]
    with conn.begin() as trans:
        ct.action_player.create(checkfirst=True)
        conn.execute(InsertFromSelect(ct.action_player, ['action_id', 'player_id'],
            select([ct.action.c.id, ct.player.c.id]).\
                select_from(ct.action.join(action).join(ct.player, ct.player.c.log_uid == action.c.multiplayer_uid))
        ))


def create_usernames(conn, state_tables):
    members = state_tables[ct.state_members]
    with conn.begin() as trans:
        conn.execute(ct.player.update().\
            values(username=members.c.mem_login).\
            where(ct.player.c.log_uid == members.c.uid)
        )

def main(args):
    engine = cli.create_dst_engine(args)

    with engine.connect() as conn:
        ct.metadata.bind = conn

        log_tables = ct.load_logging_tables_from_local(conn)

        create_log_table_indices(conn, log_tables)

        create_players_and_sessions(conn, log_tables)
        create_single_player_traces(conn, log_tables)
        create_trace_wins_and_actions(conn, log_tables)
        create_single_player_action_player(conn, log_tables)

        ct.session_version.create(conn)

def get_parser():
    _DESC = 'Create game/player tables from transferred logging tables.'
    parser = argparse.ArgumentParser(description=_DESC, parents=[cli.single_engine_parser], add_help=False)
    parser.set_defaults(func=main)
    return parser

