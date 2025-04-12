import path from 'path';

export default {
  entry: {
    mainHandler: './backend/functions/mainHandler.js',
    publicUploadHandler: './backend/functions/publicUploadHandler.js',
  },
  target: 'node', // Still targeting Node.js environment
  mode: 'production',
  output: {
    path: path.resolve('dist'),
    filename: '[name].js', // Output file name will match the entry point name
    libraryTarget: 'module', // Output as ES Module
    module: true, // Ensure the output is an ES Module
  },
  experiments: {
    outputModule: true, // Enable ES Module output for Webpack
  },
  externals: [
  ],
  resolve: {
    extensions: ['.js', '.json'],
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
            plugins: ['@babel/plugin-transform-runtime'], // Add this to handle async/await properly
          },
        },
      },
    ],
  },
  devtool: false, // Disable source maps for production
};
