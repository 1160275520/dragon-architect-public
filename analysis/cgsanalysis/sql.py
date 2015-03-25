from __future__ import absolute_import, print_function, unicode_literals
from sqlalchemy import Table
from sqlalchemy.schema import ForeignKeyConstraint, AddConstraint, DropConstraint, CreateTable, Column
from sqlalchemy.types import NullType, Integer
from sqlalchemy.ext import compiler
from sqlalchemy.sql import func
from sqlalchemy.sql.expression import Executable, ClauseElement, ColumnElement, FunctionElement

"""Extensions to SQLAlchemy Expression Engine and some helper functions for queries"""

class CreateView(Executable, ClauseElement):
    def __init__(self, name, select):
        self.name = name
        self.select = select

@compiler.compiles(CreateView)
def _visit_create_view(element, compiler, **kw):
    return "CREATE VIEW %s AS %s" % (
        element.name,
        compiler.process(element.select, literal_binds=True)
    )

class DropView(Executable, ClauseElement):
    def __init__(self, name):
        self.name = name

@compiler.compiles(DropView)
def _visit_drop_view(element, compiler, **kw):
    return "DROP VIEW %s" % (element.name)

class View(object):
    def __init__(self, name, metadata, select, *args):
        self.name = name
        self._metadata = metadata
        self._select = select
        self._args = args
        self._table = None

    def _reflect(self):
        self._table = Table(self.name, self._metadata, *self._args, autoload=True)

    @property
    def table(self):
        if self._table is None:
            self._reflect()
        return self._table

    def create(self, conn):
        conn.execute(CreateView(self.name, self._select))
        self._table = self._reflect()

    def drop(self, conn, checkfirst=False):
        conn.execute(DropView(self.name))

class least(ColumnElement):
    """LEAST in mysql/postgres, MIN in sqlite"""
    def __init__(self, *args):
        self.args = args

@compiler.compiles(least)
def _visit_least(element, compiler, **kw):
    return compiler.process(func.least(*element.args))

@compiler.compiles(least, 'sqlite')
def _visit_least(element, compiler, **kw):
    return compiler.process(func.min(*element.args))

class greatest(ColumnElement):
    """GREATEST in mysql/postgres, MAX in sqlite"""
    def __init__(self, *args):
        self.args = args

@compiler.compiles(greatest)
def _visit_greatest(element, compiler, **kw):
    return compiler.process(func.greatest(*element.args))

@compiler.compiles(greatest, 'sqlite')
def _visit_greatest(element, compiler, **kw):
    return compiler.process(func.max(*element.args))

class InsertFromSelect(Executable, ClauseElement):
    """SQLAlchemy expression that compiles to
    'INSERT INTO table (select);'
    """
    def __init__(self, table, columns, select):
        self.table = table
        self.columns = columns
        self.select = select

@compiler.compiles(InsertFromSelect)
def _visit_insert_from_select(element, compiler, **kw):
    return "INSERT INTO %s (%s) %s" % (
        compiler.process(element.table, asfrom=True),
        ', '.join(element.columns),
        compiler.process(element.select)
    )

class CreateTemporaryTableAsSelect(Executable, ClauseElement):
    """SQLAlchemy expression that compiles to
    'CREATE TEMPORARY tablename TABLE AS (select);'
    """
    def __init__(self, tablename, select, definition=None):
        self.tablename = tablename
        self.select = select
        self.defnstr = definition if definition is not None else ""

@compiler.compiles(CreateTemporaryTableAsSelect)
def _visit_create_temporary_table_as_select(element, compiler, **kw):
    return "CREATE TEMPORARY TABLE %s %s AS %s" % (
        element.tablename,
        element.defnstr,
        compiler.process(element.select)
    )

class AddPrimaryKey(Executable, ClauseElement):
    """SQLAlchemy expression that adds a primary key to a table."""
    def __init__(self, table, column):
        self.table = table
        self.column = column

@compiler.compiles(AddPrimaryKey)
def _visit_add_pkey(element, compiler, **kw):
    return "ALTER TABLE %s ADD PRIMARY KEY (%s)" % (
        element.table.name,
        element.column
    )

def drop_fkey_constraints(conn, table):
    for c in table.constraints:
        if isinstance(c, ForeignKeyConstraint):
            print(c)
            conn.execute(DropConstraint(c))

def add_fkey_constraints(conn, table):
    for c in table.constraints:
        if isinstance(c, ForeignKeyConstraint):
            conn.execute(AddConstraint(c))

def get_fk_type(column):
    """Returns a type suitable for using as a foreign key for the given column.
    Takes care of MySQL requirements by ensuring FKC types match exactly.
    Takes care of sqlite restrictions by defaulting to integer if the column has "NoneType" (implying it used to be big int).
    """
    if isinstance(column.type, NullType):
        return Integer()
    else:
        return column.type

def create_temp_table_as_select(connection, metadata, table_name, select, defn=None):
    """Executes a CreateTemporaryTableAsSelect and returns the Table object for the newly created table.
    Totally does need deal with any sqlite BS.
    """
    connection.execute(CreateTemporaryTableAsSelect(table_name, select, defn))
    return Table(table_name, metadata, autoload=True, autoload_with=connection)

def create_temp_table_as_select_pkey(connection, metadata, tmp_table_name, column, select):
    """Creates a temporary table from a select statement that has a single column
    of the same type and name as the given column.
    That column should be the primary key of the other table.

    Deals with sqlite BS by creating the temp table first then doing an insert.
    """
    table = Table(tmp_table_name, metadata, Column(column.name, get_fk_type(column), primary_key=True), prefixes=['TEMPORARY'])
    if connection.engine.name != 'mysql':
        # sqlite/postgres doesn't suport this crap so have to manually create the table then do an insert
        table.create(connection)
        connection.execute(InsertFromSelect(table, [column.name], select))
    else:
        # get the table definition by compiling the create statement and stripping everything before the opening paren
        createstm = str(CreateTable(table))
        defn = createstm[createstm.find('('):]
        connection.execute(CreateTemporaryTableAsSelect(tmp_table_name, select, defn))
    return table

def create_temp_table_as_select_fkey(connection, metadata, tmp_table_name, column, select):
    """Same as create_temp_table_as_select_pkey, but also tacks a ForiegnKeyConstraint on it.
    This is done after creation, so it doesn't ACTUALLY add it, but joins will be easier.
    You can't get it for reals because MySQL FAILTASM (can't have fkc on temp tables).
    """
    # TODO maybe add the fkc for real on systems that support it?
    table = create_temp_table_as_select_pkey(connection, metadata, tmp_table_name, column, select)
    # fake add a foreign key on here to make joins easier even though MySQL doesn't support it so it won't actually exist
    table.append_constraint(ForeignKeyConstraint([column.name], [column]))
    return table

