
var RUTHEFJORD_CONFIG = {
    server: {
        url: 'http://gigantor.cs.washington.edu:27246/api',
        storage: 'server' // can be 'server', 'local', or 'session'
    },
    logging: {
        url: 'http://gigantor.cs.washington.edu:27895',
        release_id: '6DAC7E4A-B208-4A13-B5AB-09CA2484270E',
        release_name: '150716 capitol hill library day 2',
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
        group: "SPL"
    }
};

