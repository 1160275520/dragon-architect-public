DEBUG=False
SQLALCHEMY_DATABASE_URI = 'postgresql:///logging'
PORT = 27895
PAPIKA_EXPERIMENTS = {
    '00000000-0000-0000-0000-000000000000': {
        'conditions': [
            {'id':1, 'name': 'im a condition'},
            {'id':2, 'name': 'im another condition'},
        ],
    },
    '370D0C88-16C3-47EF-89F5-32927863A59C': {
        'conditions': [
            {'id':1, 'name': 'puzzles only'},
            {'id':2, 'name': 'puzzles and sandbox'},
        ],
    },
}
