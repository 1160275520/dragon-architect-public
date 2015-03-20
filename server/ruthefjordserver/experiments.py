from __future__ import absolute_import, print_function, unicode_literals

# let's hard-code experimental conditions so it's easy to version control!

import uuid

experiments = {
    '7e14b455-2eb4-4485-b210-59d97003da8a': {
        'conditions': [
            {'id':1, 'name': 'no debugging tools'},
            {'id':2, 'name': 'yes debugging tools'},
        ],
    },
}

