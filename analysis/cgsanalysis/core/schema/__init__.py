# Python 3.4+
from .base import *
from .logging import *
from .specification import *
from .specification import tables as specification_tables
from .player import *
from .player import tables as player_tables, views as player_views

tables = specification_tables + player_tables

