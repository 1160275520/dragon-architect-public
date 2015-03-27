# Python 3.4+
from sqlalchemy import Table, Column, Integer, String, Boolean, BigInteger, ForeignKey, ForeignKeyConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from cgsanalysis.core.schema.base import metadata, register
from cgsanalysis.core import schema as ct

tables = []

def _t(t):
    tables.append(t)
    return t

session_tos = _t(Table('rfl_session_tos', metadata,
    Column('session_id', ct.session.c.id.type, ForeignKey(ct.session.c.id, ondelete="CASCADE"), primary_key=True),
    Column('tos_id', Integer, nullable=False),
    Column('did_accept', Boolean, nullable=False),
    info=dict(doc="""
    The result of the TOS consent for the given session. Assumes only one TOS per session (but could easily relax this).
    """)
))

session_login = _t(Table('rfl_session_login', metadata,
    Column('session_id', ct.session.c.id.type, ForeignKey(ct.session.c.id, ondelete="CASCADE"), primary_key=True),
    Column('user_id', UUID, nullable=False),
    Index('rfl_session_login_idx__user_id', 'user_id', unique=False),
    info=dict(doc="""
    Which ruthefjord user id the player logged in as for a session.
    """)
))

session_experiment = _t(Table('rfl_session_experiment', metadata,
    Column('session_id', ct.session.c.id.type, ForeignKey(ct.session.c.id, ondelete="CASCADE"), primary_key=True),
    Column('experiment_id', UUID, nullable=False),
    Column('condition', Integer, nullable=False),
    info=dict(doc="""
    The experimental condition the player was in for a session.
    """)
))

