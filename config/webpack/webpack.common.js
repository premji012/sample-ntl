const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const paths = require('./paths');
const rules = require('./rules');
const Dotenv = require('dotenv-webpack');

const mode = process.env.NODE_ENV || 'development';
const prod = mode === 'production';


module.exports = {
	context: paths.contextPath,
	entry: {
		main: paths.entryPath,
	},
	module: {
		'rules': [...rules,
			{
				test: /\.svelte$/,
				use: {
					loader: 'svelte-loader',
					options: {
						compilerOptions: {
							dev: !prod
						},
						preprocess: require('svelte-preprocess')({
							postcss: false
						}),
						emitCss: prod,
						hotReload: !prod
					}
				}
			},
		],
	},
	resolve: {
		alias: {
		  svelte: path.resolve('node_modules', 'svelte')
		},
		extensions: ['.mjs', '.js', '.ts', '.svelte'],
		mainFields: ['svelte', 'browser', 'module', 'main']
	  },
	plugins: [
		new Dotenv({
            systemvars: true
        }),
		new CleanWebpackPlugin(),
	]
};