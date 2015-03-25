# Python 3.4+

class GameInfo(object):
    def __init__(self, gid, name, dbFormatStr=None):
        self.gid = gid
        self.name = name
        if dbFormatStr is not None:
            self.dbFormatStr = dbFormatStr
        else:
            self.dbFormatStr = "cgs_gm_%s" % self.name

    @property
    def db_game(self): return self.dbFormatStr
    @property
    def db_log(self): return self.dbFormatStr + "_log"
    @property
    def db_ab(self): return self.dbFormatStr + "_ab"

    @property
    def dbs(self):
        return {
            "game":self.db_game,
            "log":self.db_log,
            "ab":self.db_ab,
        }

games = [
    GameInfo(1,  "twilite"),
    GameInfo(10, "test", dbFormatStr="dev_cgs_gm"),
    GameInfo(11, "refraction"),
    GameInfo(13, "infiniterefr"),
    GameInfo(14, "dragonbox"),
    GameInfo(19, "hackcraft"),
    GameInfo(22, "numberline"),
    GameInfo(24, "cardgame"),
    GameInfo(40, "assessments"),
]

def games_by_name():
    return dict([(g.name, g) for g in games])
def games_by_gid():
    return dict([(g.gid, g) for g in games])

