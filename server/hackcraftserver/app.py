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
    id = db.Column(db.Unicode, primary_key=True) # uuid
    progress = db.Column(db.Unicode) # json

class SavedProcedure(db.Model):
    __tablename__ = 'savedprocedure'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Unicode) # procedure name
    contents = db.Column(db.Unicode) # program json
    creator_id = db.Column(db.Unicode, db.ForeignKey('player.id'))
    parent_id = db.Column(db.Integer, db.ForeignKey(id)) # which procedure this was remixed from

    creator = db.relationship('Player', backref=db.backref('saved_procedures', lazy='dynamic'))

def setup():
    # Create the database tables.
    db.create_all()

    # Create the Flask-Restless API manager.
    manager = flask.ext.restless.APIManager(app, flask_sqlalchemy_db=db)

    # Create API endpoints, which will be available at /api/<tablename> by default.
    manager.create_api(Player, methods=['GET', 'POST'])
    manager.create_api(SavedProcedure, methods=['GET', 'POST', 'PUT'])

def create_test_data():
    db.create_all()

    p = Player(id='b417c779-b462-4149-97c6-5618f9772e8e', progress='null')
    f1 = SavedProcedure(id=1, name='foo', contents='{"F1":{"arity":0,"body":[{"args":[{"type":"literal","value":"1"}],"meta":{"id":3},"proc":"Forward","type":"call"},{"args":[],"meta":{"id":4},"proc":"Right","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":5},"proc":"Forward","type":"call"},{"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":6},"proc":"PlaceBlock","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":7},"proc":"Forward","type":"call"},{"args":[],"meta":{"id":8},"proc":"Left","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":9},"proc":"Forward","type":"call"},{"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":10},"proc":"PlaceBlock","type":"call"}]},"MAIN":{"arity":0,"body":[{"numtimes":{"type":"literal","value":"10"},"meta":{"id":20},"stmt":{"meta":{"id":22},"body":[{"args":[],"meta":{"id":21},"proc":"F1","type":"call"}],"type":"block"},"type":"repeat"}]}}', creator_id=p.id)
    f2 = SavedProcedure(id=2, name='bar', contents='{"F1":{"arity":0,"body":[{"args":[{"type":"literal","value":"1"}],"meta":{"id":3},"proc":"Forward","type":"call"},{"args":[],"meta":{"id":4},"proc":"Right","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":5},"proc":"Forward","type":"call"},{"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":6},"proc":"PlaceBlock","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":7},"proc":"Forward","type":"call"},{"args":[],"meta":{"id":8},"proc":"Left","type":"call"},{"args":[{"type":"literal","value":"1"}],"meta":{"id":9},"proc":"Forward","type":"call"},{"args":[{"type":"literal","value":"#5cab32"}],"meta":{"id":10},"proc":"PlaceBlock","type":"call"}]},"MAIN":{"arity":0,"body":[{"numtimes":{"type":"literal","value":"10"},"meta":{"id":20},"stmt":{"meta":{"id":22},"body":[{"args":[],"meta":{"id":21},"proc":"F1","type":"call"}],"type":"block"},"type":"repeat"}]}}', creator_id=p.id)

    db.session.add(p)
    db.session.add(f1)
    db.session.add(f2)
    db.session.commit()


