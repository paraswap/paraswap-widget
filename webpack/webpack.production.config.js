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
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
            },
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
            },
          },
        ]
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, {
          loader: "css-loader",
          options: {
            sourceMap: true,
          },
        }]
      },
    ],
  },
  plugins: [new MiniCssExtractPlugin({
    filename: 'PSWidget.css', // extract styles
  })],
});
