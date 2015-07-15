from __future__ import absolute_import, print_function, unicode_literals

import flask
import flask.ext.sqlalchemy
import flask.ext.restless
from flask import request
from sqlalchemy.dialects.postgresql import UUID
import uuid
import random
from .experiments import experiments

app = flask.Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql:///ruthefjord'
db = flask.ext.sqlalchemy.SQLAlchemy(app)

@app.after_request
def add_cors_header(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'HEAD, GET, POST, PATCH, PUT, OPTIONS, DELETE'
    response.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept'
    response.headers['Access-Control-Allow-Credentials'] = 'true'

    return response

class Player(db.Model):
    __tablename__ = 'player'
    id = db.Column(UUID, primary_key=True)
    username = db.Column(db.Unicode, unique=True, index=True, nullable=True)
    puzzles_completed = db.Column(db.Unicode)
    sandbox_program = db.Column(db.Unicode)
    sandbox_world_data = db.Column(db.Unicode)

class UploadedProject(db.Model):
    __tablename__ = 'uploaded_project'
    id = db.Column(UUID, primary_key=True)
    author = db.Column(UUID)
    name = db.Column(db.Unicode)
    time = db.Column(db.DateTime)
    program = db.Column(db.Unicode)
    screen = db.Column(db.Unicode)
    # the initial world data (before program is run)
    world_data = db.Column(db.Unicode)
    group = db.Column(db.Unicode)

    @property
    def serialize(self):
        return {
            'id' : self.id,
            'author' : self.author,
            'name' : self.name,
            'time' : self.time,
            'program' : self.program,
            'screen' : self.screen,
            'world_data' : self.world_data,
            'group' : self.group
        }
    

# HACK this is a poor way to do this, extend with REST thing later
@app.route('/api/get_player/<id>', methods=['GET'])
def get_player(id):
    player = Player.query.filter_by(id=id).first()
    if player is None:
        # create a new random user id
        player = Player(id=id, username=None)
        db.session.add(player)
        db.session.commit()
    return flask.jsonify(
        id=player.id,
        puzzles_completed=player.puzzles_completed,
        sandbox_program=player.sandbox_program,
        sandbox_world_data=player.sandbox_world_data,
        username=player.username
    )

@app.route('/api/get_gallery/<group>', methods=['GET'])
def get_gallery(group):
    projects = UploadedProject.query.filter_by(group=group).all()
    return flask.jsonify(projects=[p.serialize for p in projects])

@app.route('/api/create_player', methods=['POST'])
def get_player_id():
    # create a new random player id
    player = Player(id=unicode(uuid.uuid4()))
    db.session.add(player)
    db.session.commit()
    result = { 'id':player.id }
    return flask.jsonify(result=result)

# TODO rename
@app.route('/api/getuid', methods=['POST'])
def uuid_of_username():
    content = request.json
    username = content['username']
    namespace = uuid.UUID('0caa0ca1-9d81-43f2-8fd4-4869fee5864f')
    uid = unicode(uuid.uuid5(namespace, username.encode('utf-8')))
    result = { 'uuid':uid }
    return flask.jsonify(result=result)

def setup():
    # Create the database tables.
    db.create_all()

    # Create the Flask-Restless API manager.
    manager = flask.ext.restless.APIManager(app, flask_sqlalchemy_db=db)

    # Create API endpoints, which will be available at /api/<tablename> by default.
    manager.create_api(Player, methods=['GET', 'POST', 'PUT'])
    manager.create_api(UploadedProject, methods=['GET', 'POST', 'PUT'])

