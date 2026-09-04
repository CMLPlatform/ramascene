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
        //the base directory (abs. path) for resolving the entry option
        context: __dirname,
        entry: [APP_DIR + '/entry.js'],

        output: {
            //where to store compiled bundle
            path: path.resolve(__dirname, 'assets/bundles/'),
            //webpack naming convention where files are stored
            filename: isProduction ? '[name]-[contenthash].js' : '[name]-[hash].js',
            publicPath: '/static/bundles/'
        },

        plugins: [
            //where to store meta-data about the bundle
            new BundleTracker({path: __dirname, filename: './webpack-stats.json'}),
            new MiniCssExtractPlugin({
                filename: isProduction ? '[name]-[contenthash].css' : '[name]-[hash].css'
            }),

            new webpack.ProvidePlugin({
                process: 'process/browser'
            }),
            new webpack.ProvidePlugin({
                Buffer: ['buffer', 'Buffer']
            }),
            new Dotenv({
                path: path.resolve(__dirname, '.env'),
                safe: true,
                systemvars: true,
                defaults: {
                    'NODE_ENV': isProduction ? 'production' : 'development'
                }
            }),
            new webpack.DefinePlugin({
                'WEBSOCKET_URL': JSON.stringify(process.env.WS_PROTOCOL + '://' + process.env.WS_HOST + '/ws/ramascene/'),
                'AJAX_URL': JSON.stringify(process.env.PROTOCOL + '://' + process.env.HOST + '/ajaxhandling/')
                // 'WEBSOCKET_URL': '"ws://ramascene.local/ws/ramascene/"',
                // 'AJAX_URL': '"http://ramascene.local/ajaxhandling/"'
                // 'WEBSOCKET_URL': '"ws://cml.liacs.nl:8080/ws/ramascene/"',
                // 'AJAX_URL': '"http://cml.liacs.nl:8080/ajaxhandling/"'
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
        
        optimization: {
            splitChunks: {
                chunks: 'all'
            }
        },
        
        devtool: isProduction ? 'source-map' : 'eval-source-map'
    }
};
