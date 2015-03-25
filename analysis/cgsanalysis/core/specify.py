"""Operations that manipulate the specification tables, e.g., marking a cid for download.
"""

# Python 3.4+
import argparse
from . import schema as ct
from cgsanalysis import gameinfo, cli

def mark_category_id(conn, gid, cid):
    if not isinstance(gid, int): raise TypeError('gid must be an int')
    if not isinstance(cid, int): raise TypeError('cid must be an int')

    with conn.begin() as trans:
        conn.execute(ct.spec_category.insert().values(gid=gid, cid=cid))

def mark_banned_uid(conn, uid):
    uid = str(uid)

    with conn.begin() as trans:
        conn.execute(ct.spec_banned_user.insert().values(uid=uid))

def new_version(conn, gid):
    if not isinstance(gid, int): raise TypeError('gid must be an int')

    with conn.begin() as trans:
        result = conn.execute(ct.version.insert().values(game_id=gid))
        return result.inserted_primary_key[0]

def mark_version(conn, vid, cid, cdid):
    if not isinstance(vid, int): raise TypeError('vid must be an int')
    if not isinstance(cid, int): raise TypeError('cid must be an int')
    if cdid is not None and not isinstance(cdid, int): raise TypeError('cdid must be an int')

    with conn.begin() as trans:
        conn.execute(ct.version_release.insert().values(version_id=vid, category_id=cid, condition_id=cdid))

def _main_init(args):
    engine = cli.create_dst_engine(args)

    with engine.connect() as conn:
        ct.spec_category.create(conn, checkfirst=True)
        ct.spec_user.create(conn, checkfirst=True)
        ct.spec_banned_user.create(conn, checkfirst=True)
        ct.version.create(conn, checkfirst=True)
        ct.version_release.create(conn, checkfirst=True)

        # always mark the blank uid as banned
        mark_banned_uid(conn, '')

def _main_markcid(args):
    gid = gameinfo.games_by_name()[args.game].gid
    engine = cli.create_dst_engine(args)

    with engine.connect() as conn:
        ct.metadata.bind = conn
        for cid in args.cid:
            mark_category_id(conn, gid, cid)

def _main_newversion(args):
    gid = gameinfo.games_by_name()[args.game].gid
    engine = cli.create_dst_engine(args)

    with engine.connect() as conn:
        ct.metadata.bind = conn 
        pk = new_version(conn, gid)
        print('Created version "%d"' % pk)

def _main_markversion(args):
    engine = cli.create_dst_engine(args)

    with engine.connect() as conn:
        ct.metadata.bind = conn 
        mark_version(conn, args.vid, args.cid, args.cdid)


def make_subparsers(subprs):
    games = gameinfo.games_by_name()

    p_init = subprs.add_parser('init', parents=[cli.single_engine_parser], help='Initialize the spec tables.')
    p_init.set_defaults(func=_main_init)

    p_markcid = subprs.add_parser('markcid', parents=[cli.single_engine_parser], help='Mark a GID/CID pair for collection.')
    p_markcid.set_defaults(func=_main_markcid)
    p_markcid.add_argument('game', choices=games, metavar="game", help="The game. Choices are {%s}." % ", ".join(games.keys()))
    p_markcid.add_argument('cid', type=int, nargs="+", help="The category id. Can specify multiple.")

    p_newversion = subprs.add_parser('newversion', parents=[cli.single_engine_parser], help='Create a new version id.')
    p_newversion.set_defaults(func=_main_newversion)
    p_newversion.add_argument('game', choices=games, metavar="game", help="The game. Choices are {%s}." % ", ".join(games.keys()))

    p_markversion = subprs.add_parser('markversion', parents=[cli.single_engine_parser], help='Associate a CID/CDID with a version.')
    p_markversion.set_defaults(func=_main_markversion)
    p_markversion.add_argument('vid', type=int, help="The version id.")
    p_markversion.add_argument('cid', type=int, help="The category id.")
    p_markversion.add_argument('cdid', type=int, nargs='?', default=None, help="The (optional) condition id. Default is no condition.")

