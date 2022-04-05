const postcssFlexbugsFixes = require('postcss-flexbugs-fixes');
// const { postcss: postCssNormalize } = require('postcss-normalize');
const postcssPresetEnv = require('postcss-preset-env');

module.exports = {
    plugins: [
        require('postcss-import'),
        postcssFlexbugsFixes(),
        postcssPresetEnv({
            autoprefixer: {
                flexbox: 'no-2009',
            },
            stage: 3,
        }),
        // postCssNormalize()
    ]
}