//require our dependencies
var path = require('path');
var webpack = require('webpack');
const {resolve} = require('path');
var BundleTracker = require('webpack-bundle-tracker');
const Dotenv = require('dotenv-webpack');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const APP_DIR = resolve(__dirname, 'assets/js/client');

module.exports = env => {
    return {
        //the base directory (abs. path) for resolving the entry option
        context: __dirname,
        entry: ['babel-polyfill', APP_DIR + '/ramascene.js'],

        output: {
            //where to store compiled bundle
            path: path.resolve(__dirname + '/assets/bundles/'),

            //webpack naming convention where files are stores
            filename: '[name]-[hash].js'
        },

        plugins: [
            //where to store meta-data about the bundle
            new BundleTracker({path: __dirname, filename: './webpack-stats.json'}),
            new ExtractTextPlugin({
                filename: 'style.css',
                disable: false,
                allChunks: true

            }),
            new webpack.DefinePlugin({
                'process.env': {
                    'NODE_ENV': JSON.stringify('dev')
                }
            }),

            new webpack.DefinePlugin({
                'WEBSOCKET_URL': '"ws://127.0.0.1:8000/ramascene/"',
                'AJAX_URL': '"http://127.0.0.1:8000/ajaxhandling/"'
            })
        ],

        module: {
            loaders: [
                {
                    include: APP_DIR,
                    loader: 'babel-loader',
                    query: {
                        //what will be dealing with (react code)
                        presets: ['es2015', 'react'],
                        plugins: ['transform-class-properties']
                    },
                    test: /\.js$/
                },
                {
                    test: /\.(css|sass|scss)$/,
                    use: ExtractTextPlugin.extract({fallback: 'style-loader', use: 'css-loader!sass-loader'})
                },
                {
                    test: /\.woff2?$|\.ttf$|\.svg$|\.eot$/,
                    use: [
                        {
                            loader: 'file-loader'
                        }
                    ]
                }
            ]
        },

        resolve: {
            //where to look for modules

            extensions: ['.js', '.jsx', '.css']
        }
    }
};
