
var RUTHEFJORD_CONFIG = {
    server: {
        url: 'http://gigantor.cs.washington.edu:27246/api',
        storage: 'server' // can be 'server', 'local', or 'session'
    },
    logging: {
        url: 'http://gigantor.cs.washington.edu:27895',
        release_id: 'E1E5C9D5-1768-4868-8B4B-F0440EECAE57',
        release_name: '150720 creative computing playtest',
        release_key: ''
    },
    features: {},
    experiment: {
        id: '6C853767-7307-417B-A565-BA4614536026'
    },
    feature_conditions: {
        1: {
            is_debugging: true,
            debugging_always: true,
            workshop_only: true
        },
        2: {
            is_debugging: false,
            workshop_only: true
        }
    },
    gallery: {
        group: "creative_computing"
    }
};

