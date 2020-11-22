const merge = require('webpack-merge');
const nodeExternals = require('webpack-node-externals');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const common = require('./webpack.common.config.js');

module.exports = merge(common(), {
  mode: 'production',
  devtool: 'source-map',
  externals: [nodeExternals({
    allowlist: [/\.s?css$/] // don't drop style dependencies
  })],
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader',
        ]
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ]
  },
  plugins: [new MiniCssExtractPlugin({
    filename: 'PSWidget.css', // extract styles
  })],
});
