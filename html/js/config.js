var RUTHEFJORD_CONFIG = {
    server: {
        url: 'http://localhost:27246/api',
        storage: 'local'
    },
    logging: {
        url: 'http://localhost:27895',
        release_id: '0c7e35c6-a2c2-11e5-b814-8ba4865acbbb',
        release_name: 'latest',
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
        group: "cgs_web"
    }
};

