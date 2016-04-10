var path = require('path');
var webpack = require('webpack');
module.exports = {
    entry: './js/main.js',
    // assumes all JavaScript files you edit will be in js/
    // when importing from src/<file>.js, only need to specify as <file>
    resolve: {
        root: [
            path.resolve('./js'), // must be absolute path
            path.resolve('./lib'),
            path.resolve('./generated')
            ],
        extensions: ['', '.js'],

    },
    devtool: 'source-map', // source maps to ease debugging
    module: {
        preLoaders: [
            { test: /\.json$/, loader: 'json'},
        ],
        loaders: [
            { test: /app\.js$/, loader: 'expose?core'},
            {
                // pre-process every *.js file (except for ones in
                // node_modules/) with Babel:
                test: /\.js$/,
                exclude: /node_modules|generated/,
                loaders: [
                    // invokes Babel to translate ES6
                    'babel-loader?cacheDirectory&presets[]=es2015'
                ]
            },
            { test: /jquery\.js$/, loader: 'expose?$' },
            { test: /jquery\.js$/, loader: 'expose?jQuery' },
            { test: /bootstrap-slider\.js$/, loader: 'expose?slider' },
            { test: /q\.js$/, loader: 'expose?Q' },
            { test: /lodash\.js$/, loader: 'expose?_' }
        ]

    },
    node: {
        net: 'empty',
        dns: 'empty'
    },
    plugins: [
        new webpack.DefinePlugin({
            COPILOT: false,
            DEBUG: true
        }),
        new webpack.ProvidePlugin({
            'fetch': 'imports?this=>global!exports?global.fetch!whatwg-fetch'
        }),
        new webpack.ProvidePlugin({
            'Blockly': 'blockly',
            'window.Blockly': 'blockly'
        })
    ]
};