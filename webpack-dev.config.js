const path = require('path');
const webpack = require('webpack');

module.exports = (env) => {
    return {
        entry: './src/main.js',
        mode: 'development',
        devtool: 'eval-source-map',
        output: {
            filename: 'main.js',
            path: path.resolve(__dirname, 'dist'),
        },
        watchOptions: {
            poll: true,
        },
        devServer: {
            static: {
                directory: path.join(__dirname, 'dist'),
            },
            hot: true,
        },
        plugins: [
            new webpack.DefinePlugin({
                'ENV': JSON.stringify(env)
            }),
        ],
    }
};