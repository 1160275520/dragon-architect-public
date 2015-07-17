import flask, flask.ext.restless, flask_cors
import uuid
import random
from .models import db, Player, UploadedProject

app = flask.Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql:///ruthefjord'
db.init_app(app)
cors = flask_cors.CORS(app)

@app.after_request
def add_cors_header(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'HEAD, GET, POST, PATCH, PUT, OPTIONS, DELETE'
    response.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept'
    response.headers['Access-Control-Allow-Credentials'] = 'true'

    return response

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
    with app.app_context():
        # Create the database tables.
        db.create_all()

        # Create the Flask-Restless API manager.
        manager = flask.ext.restless.APIManager(app, flask_sqlalchemy_db=db)

        # Create API endpoints, which will be available at /api/<tablename> by default.
        manager.create_api(Player, methods=['GET', 'POST', 'PUT'])
        manager.create_api(UploadedProject, methods=['GET', 'POST', 'PUT'])

