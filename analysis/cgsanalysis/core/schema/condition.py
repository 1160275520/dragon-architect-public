# Python 3.4+
from sqlalchemy import Column, Integer, String, ForeignKey
from .base import TableBase


# Class defining a condition
class Condition(TableBase):
    __tablename__ = 'condition'

    id = Column(Integer, primary_key = True)
    name = Column(String)

    def __init__(self, conditionId, name):
        self.id = conditionId
        self.name = name

# Class defining the relation between sessions and conditions
class SessionCondition(TableBase):
    __tablename__ = 'session_condition'

    session_id = Column(Integer, ForeignKey('session.id'), primary_key = True)
    condition_id = Column(Integer, ForeignKey('condition.id'))

    def __init__(self, sessionId, conditionId):
        self.session_id = sessionId
        self.condition_id = conditionId

#########################
# Relations to Logging
#########################

class RelationCondition(TableBase):
    __tablename__ = 'relation_to_logging_condition'

    condition_id = Column(Integer, ForeignKey('condition.id'), primary_key = True)
    logging_condition_id = Column(Integer, unique = True)

    def __init__(self, conditionId, loggingConditionId):
        self.condition_id = conditionId
        self.logging_condition_id = loggingConditionId

#########################
# Lists
#########################

base_tables = [Condition, SessionCondition]
relations_tables = [RelationCondition]
all_tables = base_tables + relations_tables

