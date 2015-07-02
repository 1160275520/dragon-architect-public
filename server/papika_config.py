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
}
