from __future__ import absolute_import, print_function, unicode_literals

import flask
import flask.ext.sqlalchemy
import flask.ext.restless
from flask import request
from sqlalchemy.dialects.postgresql import UUID
import uuid

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

@app.route('/api/getuid', methods=['POST'])
def uuid_of_username():
    content = request.json
    username = content['username']
    namespace = uuid.UUID('0caa0ca1-9d81-43f2-8fd4-4869fee5864f')
    uid = unicode(uuid.uuid5(namespace, username.encode('utf-8')))
    result = { 'uuid':uid }
    return flask.jsonify(result=result)

class Player(db.Model):
    __tablename__ = 'player'
    id = db.Column(UUID, primary_key=True)
    username = db.Column(db.Unicode, unique=True, index=True, nullable=False)
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
    # the initial world data (before program is run)
    world_data = db.Column(db.Unicode)

class ProjectScreenCapture(db.Model):
    __tablename__ = 'project_screen_capture'
    id = db.Column(UUID, primary_key=True)
    project_id = db.Column(UUID, db.ForeignKey(UploadedProject.id), nullable=False)
    data = db.Column(db.Unicode)

def setup():
    # Create the database tables.
    db.create_all()

    # Create the Flask-Restless API manager.
    manager = flask.ext.restless.APIManager(app, flask_sqlalchemy_db=db)

    # Create API endpoints, which will be available at /api/<tablename> by default.
    manager.create_api(Player, methods=['GET', 'POST', 'PUT'])
    manager.create_api(UploadedProject, methods=['GET', 'POST', 'PUT'])
    manager.create_api(ProjectScreenCapture, methods=['GET', 'POST', 'PUT'])

