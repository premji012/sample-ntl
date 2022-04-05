const imageInlineSizeLimit = 10000;
const fontInlineSizeLimit = 10000;
require('dotenv').config();

module.exports = [
    {
        test: /\.(ttf|otf|eot|woff(2)?)(\?[a-z0-9]+)?$/,
        type: 'asset/resource',
        generator: {
			filename: 'fonts/[name].[ext]'
		}
    },
    {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource', 
		generator: {
			filename: 'images/[name]-[contenthash].[ext]'
		}
    },
    {
        // required to prevent errors from Svelte on Webpack 5+, omit on Webpack 4
        test: /node_modules\/svelte\/.*\.mjs$/,
        resolve: {
          fullySpecified: false
        }
	}
];
