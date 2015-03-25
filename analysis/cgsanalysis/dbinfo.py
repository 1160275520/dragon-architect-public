# Python 3.4+
from sqlalchemy import create_engine
import getpass
import json

class DBInfo(object):
    """Database information; the host and username. Used to create engines"""
    def __init__(self, protocol, host, user, has_password):
        self.protocol = protocol
        self.host = host
        self.user = user
        self.has_password = has_password

    def url(self, dbname):
        """Returns the database URL, can be passed to sqlalchemy.create_engine."""
        if self.has_password:
            try:
                from dbpasswd import DBPASSWD_TABLE
                passwd = ':' + DBPASSWD_TABLE[self.host]
            except:
                print("dbpasswd.py not found or host not in dbpasswd.py, requiring manual password entry.")
                passwd = ':' + getpass.getpass('DB password: ')
        else:
            passwd = ''

        return "%(protocol)s://%(user)s%(passwd)s@%(host)s/%(db)s" % { 'protocol':self.protocol, 'host':self.host, 'user':self.user, 'db':dbname, 'passwd':passwd }


dbdev = DBInfo(
    protocol = 'mysql+pymysql',
    host = "dev.db.centerforgamescience.com",
    user = "cgs_gm_prd_u",
    has_password = True,
)

dbprd = DBInfo(
    protocol = 'mysql+pymysql',
    host = "prd.db.centerforgamescience.com",
    user = "cgs_gm_prd_u",
    has_password = True,
)

dbreplica = DBInfo(
    protocol = 'mysql+pymysql',
    host = "replica.db.centerforgamescience.com",
    user = "cgs_gm_prd_u",
    has_password = True,
)

dbs_by_name = {
    "dev" : dbdev,
    "prd" : dbprd,
    "replica" : dbreplica,
}

