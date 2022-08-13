const path = require('path');

module.exports = {
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
    }
};