# Python 3.4+
import argparse
from sqlalchemy.sql import select, func, insert
from cgsanalysis import cli
from cgsanalysis.core import schema as ct
from . import schema as rt
import json

AID_PLAYER_TOS = 101
AID_PLAYER_LOGIN = 102
AID_PLAYER_EXPERIMENTAL_CONDITION = 103

def process_non_trace_actions(conn, log_tables):
    '''process all non-trace actions, generating new data related to:
    tos consent, experimental conditions, player id, etc.'''

    action_nq = log_tables[ct.log_action_nq].dst_table

    # iterate over the set of all non-trace actions
    actions = conn.execute(select([ct.action_session, action_nq]).select_from(ct.action_session.join(action_nq))).fetchall()

    player_tos = []
    experimental_conditions = []
    player_logins = []

    def process_player_tos(a):
        d = json.loads(a.a_detail)
        # manually copy everything over to force a crash if anything is missing
        player_tos.append({'action_id': a.id, 'session_id':a.session_id, 'tos_id': d['tos_id'], 'did_accept': d['did_consent']})

    def process_player_login(a):
        d = json.loads(a.a_detail)
        # manually copy everything over to force a crash if anything is missing
        uid = d['id']
        if uid is not None:
            player_logins.append({'action_id': a.id, 'session_id':a.session_id, 'user_id': uid})

    def process_experimental_condition(a):
        d = json.loads(a.a_detail)
        # manually copy everything over to force a crash if anything is missing
        experimental_conditions.append({'action_id': a.id, 'session_id':a.session_id, 'experiment_id':d['experiment'], 'condition':d['condition']})

    # hooray for manual case statements as dicts of functions
    cases = {
        AID_PLAYER_TOS: process_player_tos,
        AID_PLAYER_EXPERIMENTAL_CONDITION: process_experimental_condition,
        AID_PLAYER_LOGIN: process_player_login,
    }

    for a in actions:
        try:
            cases[a.aid](a)
        except:
            # just ignore broken/dirty data
            pass

    rt.session_tos.create(checkfirst=True)
    rt.session_login.create(checkfirst=True)
    rt.session_experiment.create(checkfirst=True)

    with conn.begin() as trans:
        conn.execute(rt.session_tos.insert(), player_tos)
        conn.execute(rt.session_login.insert(), player_logins)
        conn.execute(rt.session_experiment.insert(), experimental_conditions)

def filter_tos(conn):
    """Remove all data for a player if they did not accept the given TOS."""

    # TODO implement

    # a player is considered to have accepted a TOS iff
    # they have accepted the TOS in every session for which we have data.
    # If a single session is missing we assume no and block all their data.

    raise NotImplementedError()

def main(args):
    engine = cli.create_dst_engine(args)

    with engine.connect() as conn:
        ct.metadata.bind = conn
        log_tables = ct.load_logging_tables_from_local(conn)

        process_non_trace_actions(conn, log_tables)

def get_parser():
    _DESC = 'Extract ruthefjord-specific action data'
    parser = argparse.ArgumentParser(description=_DESC, parents=[cli.single_engine_parser], add_help=False)
    parser.set_defaults(func=main)
    return parser

