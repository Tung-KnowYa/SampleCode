const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'chatbot-widget.bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      {
        // This Tailwind will be processed by PostCSS, then returned as a raw string
        test: /\.css$/i,
        type: 'asset/source',
        use: ['postcss-loader'],
      }
    ],
  },
  resolve: { extensions: ['.js', '.jsx'] },
};