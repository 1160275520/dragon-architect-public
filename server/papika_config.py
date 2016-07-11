DEBUG=False
SQLALCHEMY_DATABASE_URI = 'postgresql:///ruthefjord_logging'
PORT = 27895
SERVER = 'production'
SSL_KEY = "/srv/certs/privkey.pem"
SSL_CRT = "/srv/certs/fullchain.pem"
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
    '6C853767-7307-417B-A565-BA4614536026': {
        'conditions': [
            {'id':1, 'name': 'debugging tools'},
            {'id':2, 'name': 'turbo button only'},
        ],
    },
}
