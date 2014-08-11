from __future__ import absolute_import, print_function, unicode_literals

import flask
import flask.ext.sqlalchemy
import flask.ext.restless
from flask import request

app = flask.Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///test.db'
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
    id = db.Column(db.Unicode, primary_key=True) # username
    puzzles_completed = db.Column(db.Unicode)
    sandbox_program = db.Column(db.Unicode)
    sandbox_world_data = db.Column(db.Unicode)

def setup():
    # Create the database tables.
    db.create_all()

    # Create the Flask-Restless API manager.
    manager = flask.ext.restless.APIManager(app, flask_sqlalchemy_db=db)

    # Create API endpoints, which will be available at /api/<tablename> by default.
    manager.create_api(Player, methods=['GET', 'POST', 'PUT'])

