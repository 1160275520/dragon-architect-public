
from flask.ext.sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import UUID

db = SQLAlchemy()

class Player(db.Model):
    __tablename__ = 'player'
    id = db.Column(UUID, primary_key=True)
    username = db.Column(db.Unicode, unique=True, index=True, nullable=True)
    puzzles_completed = db.Column(db.Unicode)
    sandbox_program = db.Column(db.Unicode)
    sandbox_world_data = db.Column(db.Unicode)

    @property
    def serialize(self):
        return {
            'id' : self.id,
            'username' : self.username,
            'puzzles_completed' : self.puzzles_completed,
            'sandbox_program' : self.sandbox_program,
            'sandbox_world_data' : self.sandbox_world_data,
        }


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
            'time' : str(self.time),
            'program' : self.program,
            'screen' : self.screen,
            'world_data' : self.world_data,
            'group' : self.group,
        }

