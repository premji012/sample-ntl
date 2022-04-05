const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const TerserPlugin = require('terser-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const paths = require('./paths');
const CreateZipsPlugin = require('./CreateZipsPlugin.js');

module.exports = merge(common, {
	mode: 'production',
	devtool: false,
	output: {
		filename: 'js/[name].[contenthash].js',
		path: paths.outputPath,
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: 'css/[name].[contenthash].css',
		}),
	],
	module: {
		rules: [
			{
				test: /\.(s[ac]ss|css)$/,
				exclude: /svelte\.\d+\.(s[ac]ss|css)/,
				use: [
					MiniCssExtractPlugin.loader, 'css-loader',
					'postcss-loader', 'sass-loader'
				],
			},
			{
				test: /\.(s[ac]ss|css)$/,
				include: /svelte\.\d+\.(s[ac]ss|css)/,
				use: [
					MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'
				]
			}
		],
	},
	optimization: {
		runtimeChunk: 'single',
		splitChunks: {
			// maxInitialRequests: Infinity,
            // minSize: 30000,
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor-all',
					chunks: 'all'
                },
            },
		},
		minimize: true,
		minimizer: [
			new TerserPlugin({ 
				terserOptions: {
					sourceMap: true
				}
			 }),
			new CssMinimizerPlugin(),
			new MiniCssExtractPlugin(),
			new CreateZipsPlugin('SAMPLE_NTL'),
		],
	},
	performance: {
		hints: false,
		maxEntrypointSize: 512000,
		maxAssetSize: 512000
	},
});