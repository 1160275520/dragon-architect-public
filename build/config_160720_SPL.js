
var RUTHEFJORD_CONFIG = {
    server: {
        url: 'https://dragonarchitect.net:27246/api',
        storage: 'local'
    },
    logging: {
        url: 'https://dragonarchitect.net:27895',
        release_id: '7fb0e4f6-4e22-11e6-b3d0-33a56ee67727',
        release_name: 'spl_2016_v2',
        release_key: ''
    },
    experiment: {
        id: '322d194c-4914-11e6-aa49-570e0189cf71',
        condition_in_storage: true
    },
    features: {
        no_login_prompt: true,
        workshop_only: true
    },
    feature_conditions: {
        1: {
            is_debugging: true,
            debugging_always: true
        },
        2: {
            is_debugging: false
        }
    },
    hide_packs: [
        "decomposition"
    ],
    gallery: {
        group: "spl_2016"
    }
};

