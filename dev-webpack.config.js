//require our dependencies
const path = require('path');
const webpack = require('webpack');
const {resolve} = require('path');
const BundleTracker = require('webpack-bundle-tracker');
const Dotenv = require('dotenv-webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const APP_DIR = resolve(__dirname, 'assets/js/client');

module.exports = (env, argv) => {
    const isProduction = argv.mode === 'production';
    
    return {
        mode: isProduction ? 'production' : 'development',
        //the base directory (abs. path) for resolving the entry option
        context: __dirname,
        entry: [APP_DIR + '/entry.js'],

        output: {
            //where to store compiled bundle
            path: path.resolve(__dirname, 'assets/bundles/'),
            //webpack naming convention where files are stored
            filename: '[name]-[fullhash].js',
            publicPath: '/static/bundles/'
        },

        plugins: [
            //where to store meta-data about the bundle
            new BundleTracker({path: __dirname, filename: './webpack-stats.json'}),
            new MiniCssExtractPlugin({
                filename: '[name]-[fullhash].css'
            }),

            new webpack.ProvidePlugin({
                process: 'process/browser'
            }),
            new Dotenv({
                path: path.resolve(__dirname, '.env'),
                safe: true,
                systemvars: true,
                defaults: {
                    'NODE_ENV': 'development'
                }
            }),
            new webpack.DefinePlugin({
                'WEBSOCKET_URL': '"ws://127.0.0.1:8000/ramascene/"',
                'AJAX_URL': '"http://127.0.0.1:8000/ajaxhandling/"'
            })
        ],

        module: {
            rules: [
                {
                    include: APP_DIR,
                    test: /\.js$/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            //what will be dealing with (react code)
                            presets: ['@babel/preset-env', '@babel/preset-react'],
                            plugins: ['@babel/plugin-transform-class-properties']
                        }
                    }
                },
                {
                    test: /\.(css|sass|scss)$/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        'css-loader',
                        'sass-loader'
                    ]
                },
                {
                    test: /\.(woff2?|ttf|svg|eot)$/,
                    type: 'asset/resource',
                    generator: {
                        filename: 'fonts/[name][ext][query]'
                    }
                }
            ]
        },

        resolve: {
            //where to look for modules
            extensions: ['.js', '.jsx', '.css', '.scss', '.sass'],
            fallback: {
                "path": require.resolve('path-browserify'),
                "process": require.resolve('process/browser')
            }
        },
        
        devServer: {
            static: {
                directory: path.join(__dirname, 'static_assets'),
            },
            hot: true,
            port: 8080,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
            }
        },
        
        devtool: 'eval-source-map',
        
        optimization: {
            emitOnErrors: false
        }
    }
};
