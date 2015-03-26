"""Schema for tables containing player log data (e.g., sessions, traces, actions).
"""

# Python 3.4+
from sqlalchemy import Table, Column, Integer, String, Boolean, BigInteger, ForeignKey, ForeignKeyConstraint, Index
from sqlalchemy.sql import select, and_
from sqlalchemy.types import NullType
from .base import metadata, register, PLAYER
from .logging import type_uid, type_username, type_timestamp, _fk_of
from . import logging, specification as st
from cgsanalysis.sql import View

tables = []
views = []

def _t(t):
    tables.append(t)
    register(t, PLAYER)
    return t

def _v(t):
    views.append(t)
    register(t, PLAYER)
    return t

player = _t(Table('log_player', metadata,
    Column('id', Integer, primary_key=True),
    Column('log_uid', type_uid, unique=True),
    info=dict(doc="Defines a player (uid).")
))

session = _t(Table('log_session', metadata,
    Column('id', Integer, primary_key=True),
    Column('log_pageload_id', BigInteger, _fk_of(logging.log_pageload), unique=True),
    Column('player_id', player.c.id.type, ForeignKey(player.c.id), nullable=False),
    Column('game_id', Integer, nullable=False),
    Column('category_id', Integer, nullable=False),
    Column('start_time', type_timestamp),
    # TODO do we need this?
    #Index('release_idx', 'game_id', 'category_id', 'condition_id', unique=False),
    info=dict(doc="Defines a session for a player. Typically defined by a pageload.")
))

#session_version = _v(View('session_version', metadata,
#    select([session.c.id.label('session_id'), st.version.c.id.label('version_id')]).select_from(
#        st.version.join(st.version_release).\
#        join(session, and_(session.c.game_id == st.version.c.game_id, session.c.category_id == st.version_release.c.category_id, session.c.condition_id == st.version_release.c.condition_id))
#    ),
#    Column('session_id', Integer, ForeignKey('session.id'), primary_key=True),
#    Column('version_id', Integer, ForeignKey('version.id')),
#))

trace = _t(Table('log_trace', metadata,
    Column('id', Integer, primary_key=True),
    Column('log_quest_id', BigInteger, _fk_of(logging.log_quest), unique=True),
    Column('quest_id', Integer),
    Column('start_time', type_timestamp),
    info=dict(doc="Defines a trace (dqid).")
))

# TODO create table full of the end types to use as foreign keys so people don't have to memorize ints
# TODO figure out how to effectively log "quits" in the games

END_TYPE_UNKNOWN = 0
END_TYPE_COMPLETE = 1

trace_session = _t(Table('log_trace_session', metadata,
    Column('trace_id', Integer, ForeignKey(trace.c.id), nullable=False, primary_key=True),
    Column('session_id', session.c.id.type, ForeignKey(session.c.id), nullable=False, primary_key=True),
    # for single player this is redundant, but for multiplayer is will be different than the trace's log_quest_id
    Column('log_quest_id', BigInteger, _fk_of(logging.log_quest), unique=True),
    Column('session_sequence_index', Integer),
    Column('start_time', type_timestamp),
    Column('end_type', Integer, default=END_TYPE_UNKNOWN),
    info=dict(doc="""
    The relation describing which sessions included which traces.
    May be multiple sessions per trace for multiplayer games.
    """)
))

#action = _t(Table('log_action', metadata,
#    info=dict(doc='Generic table holding all actions. Stores info generic to all actions (basically just time).')
#))

action_session = _t(Table('log_action_session', metadata,
    #Column('id', action.c.id.type, ForeignKey(action.c.id), primary_key=True),
    Column('id', Integer, nullable=False, primary_key=True),
    Column('log_action_nq_id', BigInteger, _fk_of(logging.log_action_nq), unique=True),
    Column('session_id', session.c.id.type, ForeignKey(session.c.id), nullable=False),
    Column('session_sequence_index', Integer),
    Index('action_session_idx__session_seq', 'session_id', 'session_sequence_index', unique=True),
    info=dict(doc='Actions that are NOT part of traces')
))

action_trace = _t(Table('log_action_trace', metadata,
    #Column('id', action.c.id.type, ForeignKey(action.c.id), primary_key=True),
    Column('id', Integer, nullable=False, primary_key=True),
    Column('log_action_id', BigInteger, _fk_of(logging.log_action), unique=True),
    Column('trace_id', trace.c.id.type, ForeignKey(trace.c.id)),
    Column('trace_sequence_index', Integer),
    # relative time (in ms) of action since trace start, as reported by client
    Column('time_relative', BigInteger),
    Index('action_trace_idx__trace_seq', 'trace_id', 'trace_sequence_index', unique=True),
    info=dict(doc='Actions that are part of traces')
))

action_start = _t(Table('log_action_trace_start', metadata,
    Column('id', action_trace.c.id.type, ForeignKey(action_trace.c.id), primary_key=True),
    info=dict(doc="""
    Subtype of action, the start action exists for every trace at time zero.
    Used so that tables that need an action_id can refer to games states
    before the user has taken any actions.

    Also guaranteed to be the first action of a trace and thus can be used
    as the starting point for any recursive functions on actions.
    """)
))

## XXX TODO this should probably just be a column of action, no?
#action_player = _t(Table('action_player', metadata,
#    Column('action_id', action.c.id.type, ForeignKey(action.c.id), primary_key=True),
#    Column('player_id', player.c.id.type, ForeignKey(player.c.id)),
#))

# this table is defined here since it's generic to all games,
# even though "clean" does not actually populate it right now!
player_accepted_tos = _t(Table('player_accepted_tos', metadata,
    Column('player_id', player.c.id.type, ForeignKey(player.c.id), primary_key=True),
    Column('tos_id', Integer, primary_key=True),
    Column('did_accept', Boolean, nullable=False),
    info=dict(doc="""
    A many-to-many relation of which TOS a player has accepted/rejected.
    Must filter players by this table (and the correct tos version)
    for any research data to be published!
    """)
))

