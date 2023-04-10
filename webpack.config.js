const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: __dirname + '/src/js/sketch.ts',
  output: {
    path: __dirname + '/dist/',
    publicPath: '/',
    filename: 'js/sketch.js',
    globalObject: 'self', // this is important for worker compatibility
  },
  devServer: {
    client: {
      logging: 'info',
      progress: true,
    },
    compress: true,
    open: true,
    port: 3333,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: { allowTsInNodeModules: true },
        },
      },
      {
        test: /\.scss$/,
        use: [
          // Creates `style` nodes from JS strings
          'style-loader',
          // Translates CSS into CommonJS
          'css-loader',
          // Compiles Sass to CSS
          'sass-loader',
        ],
      },
      // {
      //   test: /\.worker\.ts$/,
      //   use: [
      //     {
      //       loader: 'worker-loader',
      //       options: {
      //         filename: 'js/[name].worker.js',
      //         inline: 'fallback',
      //       },
      //     },
      //     'ts-loader',
      //   ],
      //   exclude: /node_modules/,
      // },      
    ],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'src/index.html',
          to: 'index.html',
        },
        {
          from: 'src/favicon.ico',
          to: 'favicon.ico',
        },
        {
          from: 'src/assets',
          to: 'assets',
        },
      ],
    }),
  ],
};
