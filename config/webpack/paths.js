const { resolve } = require('path');
const root = resolve(__dirname, '../', '../');
const contextPath = resolve(root, 'src');
const outputPath = resolve(root, 'dist');
const entryPath = resolve(contextPath, 'main.ts');
const templatePath = resolve(contextPath, 'index.html');

module.exports = {
	entryPath,
	templatePath,
	outputPath,
};