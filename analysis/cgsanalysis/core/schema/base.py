"""The global metadata object used by table definitions.
"""

from __future__ import absolute_import, print_function, unicode_literals
from sqlalchemy import MetaData
from collections import defaultdict
from sqlalchemy import Table
from cgsanalysis.sql import View

metadata = MetaData()

SPEC = "spec"
"""Data that is analysis specification, e.g., which cids to pull, a level sequence loaded from a file
"""
ORIG = "logging"
"""Data that is pulled from the logging database
"""
PLAYER = "player"
"""Data that is generated from player data, e.g., the cleaned trace table.
"""

_VALID_TYPES = frozenset([SPEC, ORIG, PLAYER])

_table_map = defaultdict(list)

def register(table, ttype):
    if ttype not in _VALID_TYPES: raise ValueError('invalid table type')
    if not (isinstance(table, Table) or isinstance(table, View)): raise TypeError('table must be a table of view')
    _table_map[ttype].append(table)

def tables_of_type(ttype):
    if ttype not in _VALID_TYPES: raise ValueError('invalid table type')
    return _table_map[ttype]


