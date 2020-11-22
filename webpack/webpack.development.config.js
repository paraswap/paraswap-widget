const merge = require('webpack-merge');

const common = require('./webpack.common.config.js');

module.exports = merge(common(), {
  devtool: 'eval-source-map',
  performance: {
    hints: 'warning'
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          'style-loader', // creates style nodes from JS strings
          'css-loader', // translates CSS into CommonJS
          'sass-loader' // compiles Sass to CSS
        ]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
    ]
  },
});
