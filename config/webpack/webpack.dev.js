const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const paths = require('./paths');

module.exports = merge(common, {
	mode: 'development',
	devtool: 'inline-source-map',
	devServer: {
		hot: true,
		port: process.env.WEBPACK_PORT,
		open: false,
		compress: true,
		historyApiFallback: true
	},
	output: {
		filename: 'js/[name].js',
		path: paths.outputPath,
	},
	module: {
		rules: [
			{
				test: /\.s[ac]ss$/i,
				exclude: /svelte\.\d+\.s[ac]ss/,
				// HMR is automatically supported in style-loader without config
				use: [
					'style-loader', 'css-loader',
					'postcss-loader', 'sass-loader'],
			},
			{
				test: /\.s[ac]ss$/i,
				include: /svelte\.\d+\.s[ac]ss/,
				// HMR is automatically supported in style-loader without config
				use: ['style-loader', 'css-loader', 'sass-loader'],
			}
		],
	}
});