"""Schema for "meta tables" that contain information about which users, categories, etc. to analyze, rather than analyzable data.

All tables are prefixed with 'spec_', for example, 'spec_uid'.

These tables are used by the transfer/create functions to determine which data to collect.
"""

from __future__ import absolute_import, print_function, unicode_literals
from sqlalchemy import Table, Column, Integer, Boolean, String, ForeignKey, Index
from .base import metadata, register, SPEC
from .logging import type_uid, type_username

tables = []

def _t(t):
    tables.append(t)
    register(t, SPEC)
    return t

spec_user = _t(Table('spec_user', metadata,
    Column('uid', type_uid, primary_key=True, autoincrement=False),
    info=dict(doc="Specifies uids (user id) that should be collected.")
))

spec_banned_user = _t(Table('spec_banned_user', metadata,
    Column('uid', type_uid, primary_key=True, autoincrement=False),
    info=dict(doc="Specifies uids (user id) that should be ignored during analysis (usually because they're test uids).")
))

spec_category = _t(Table('spec_category', metadata,
    Column('gid', Integer, primary_key=True, autoincrement=False),
    Column('cid', Integer, primary_key=True, autoincrement=False),
    Column('is_multiplayer', Boolean, default=False,
        info=dict(doc="Whether this cid is a 'multiplayer' game. Used to ensure dqids are interpreted correctly.")
    ),
    Column('start', Integer, nullable=True,
        info=dict(doc="Unix timestamp of the earliest pageloads of this cid to consider. NULL means infinitely far in the past.")
    ),
    Column('end', Integer, nullable=True,
        info=dict(doc="Unix timestamp of the latest pageloads of this cid to consider. NULL means infinitely far in the future.")
    ),
    info=dict(doc="Specifies cids (category id) that should be collected. All users with relevant pageloads with these cids should be collected.")
))

version = _t(Table('version', metadata,
    Column('id', Integer, primary_key=True),
    Column('game_id', Integer, nullable=False, default=None),
    info=dict(doc="""
    Defines a 'version', which loosely is defined as a set of fixed settings for a released version of the game.
    The exact defition is typically specific to an experiment or analysis.
    Level sequences and other game-specific data are paired against a version.
    Can be related to a release/condition pair.
    For example, if the same swf for the game were released to different sites and only the cid changed, that could be considerd only one version.
    """)
))

version_release = _t(Table('version_release', metadata,
    Column('version_id', version.c.id.type, ForeignKey('version.id'), nullable=False),
    Column('category_id', Integer, nullable=False, default=None),
    Column('condition_id', Integer, nullable=True, default=None),
    info=dict(doc="Relates a particular release/condition pair to a particular version")
))

