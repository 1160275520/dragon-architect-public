"""Schema for tables containing player log data (e.g., sessions, traces, actions).
"""

from __future__ import absolute_import, print_function, unicode_literals
from sqlalchemy import Table, Column, Integer, String, ForeignKey, BigInteger, ForeignKeyConstraint, Index
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

player = _t(Table('player', metadata,
    Column('id', Integer, primary_key=True),
    Column('log_uid', type_uid, unique=True),
    Column('username', type_username, unique=True),
    info=dict(doc="Defines a player (uid).")
))

session = _t(Table('session', metadata,
    Column('id', Integer, primary_key=True),
    Column('log_pageload_id', BigInteger, _fk_of(logging.log_pageload), unique=True),
    Column('player_id', player.c.id.type, ForeignKey(player.c.id), nullable=False),
    Column('game_id', Integer, nullable=False),
    Column('category_id', Integer, nullable=False),
    Column('condition_id', Integer),
    Column('start_time', type_timestamp),
    Index('release_idx', 'game_id', 'category_id', 'condition_id', unique=False),
    info=dict(doc="Defines a session for a player. Typically defined by a pageload.")
))

session_version = _v(View('session_version', metadata,
    select([session.c.id.label('session_id'), st.version.c.id.label('version_id')]).select_from(
        st.version.join(st.version_release).\
        join(session, and_(session.c.game_id == st.version.c.game_id, session.c.category_id == st.version_release.c.category_id, session.c.condition_id == st.version_release.c.condition_id))
    ),
    Column('session_id', Integer, ForeignKey('session.id'), primary_key=True),
    Column('version_id', Integer, ForeignKey('version.id')),
))

trace = _t(Table('trace', metadata,
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

trace_session = _t(Table('trace_session', metadata,
    Column('trace_id', Integer, ForeignKey(trace.c.id), nullable=False, primary_key=True),
    Column('session_id', session.c.id.type, ForeignKey(session.c.id), nullable=False, primary_key=True),
    Column('log_quest_id', BigInteger, _fk_of(logging.log_quest), unique=True),
    Column('session_sequence_index', Integer),
    Column('start_time', type_timestamp),
    Column('end_type', Integer, default=END_TYPE_UNKNOWN),
    info=dict(doc="""
    The relation describing which sessions included which traces.
    May be multiple sessions per trace for multiplayer games.
    """)
))

action = _t(Table('action', metadata,
    Column('id', Integer, nullable=False, primary_key=True),
    Column('log_action_id', BigInteger, _fk_of(logging.log_action), unique=True),
    Column('trace_id', trace.c.id.type, ForeignKey(trace.c.id)),
    Column('trace_sequence_index', Integer),
    Column('time', Integer),
    Index('action_idx__trace_seq', 'trace_id', 'trace_sequence_index', unique=True),
    info=dict(doc='')
))

start_action = _t(Table('start_action', metadata,
    Column('id', action.c.id.type, ForeignKey(action.c.id), primary_key=True),
    info=dict(doc="""
    Subtype of action, the start action exists for every trace at time zero.
    Used so that tables that need an action_id can refer to games states
    before the user has taken any actions.

    Also guaranteed to be the first action of a trace and thus can be used
    as the starting point for any recursive functions on actions.
    """)
))

# XXX TODO this should probably just be a column of action, no?
action_player = _t(Table('action_player', metadata,
    Column('action_id', action.c.id.type, ForeignKey(action.c.id), primary_key=True),
    Column('player_id', player.c.id.type, ForeignKey(player.c.id)),
))

player_accepted_tos = _t(Table('player_accepted_tos', metadata,
    Column('player_id', player.c.id.type, ForeignKey(player.c.id), primary_key=True),
    Column('tos_key', String(255), primary_key=True),
    info=dict(doc="""
    A many-to-many relation of which TOS a player has accepted.
    Must filter players by this table (and the correct tos version)
    for any research data to be published!
    """)
))

