const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const fsPromises = fs.promises;
const fsExtra = require('fs-extra');
const chalk = require('chalk');
const ora = require('ora');
const crypto = require('crypto');

const rootDir = path.resolve(__dirname, '../', '../');
const buildDir = path.join(rootDir, 'dist');
const productionPath = path.join(rootDir, 'dist_production');
const webProductionPath = path.join(productionPath, 'web');
const nativeProductionPath = path.join(productionPath, 'native');
const cacheFilePath = path.join(nativeProductionPath, 'module.json');
const zipsContentHashFilePath = path.join(nativeProductionPath, 'zips_content_hash.json');
const TEMP_DIR_PATH = path.join(rootDir, 'tmp');

const ZIP_TYPES = { ASSETS: 'assets', LOW: 'low', HIGH: 'high' };
const FILE_ENCODING = 'utf8';

class CreateZipsPlugin {

    moduleName;

    constructor(moduleName) {
        this.moduleName = moduleName;
    }

    async constructFilesForWeb() {
        const spinner = ora(chalk.blue(`Building Web Files...`)).start();
        try {
            await fsExtra.emptyDir(webProductionPath);
            await fsExtra.copy(buildDir, webProductionPath);
            spinner.succeed(chalk.green(`Built Web Files...`));
        } catch (err) {
            spinner.fail(chalk.red('Build Web Files failed.'));
            throw new Error(err);
        }
    }

    async getContentHash(inputFilePath) {
        return new Promise((resolve, reject) => {
            try {
                const hash = crypto.createHash('md4');
                const stream = fs.createReadStream(inputFilePath, { encoding: 'utf8' });
                stream.on('data', (chunk) => hash.update(chunk, 'utf8'));
                stream.on('end', () => resolve(hash.digest('hex').slice(0, 8)));
                stream.on('error', (error) => reject(error));
            } catch (error) {
                reject(error);
            }
        });
    }

    async getFilesByZipType() {
        let fileList = {
            [ZIP_TYPES.ASSETS]: [],
            [ZIP_TYPES.LOW]: [],
            [ZIP_TYPES.HIGH]: []
        };

        const traverse = async (currDir, isAssestDir = false) => {
            try {
                const files = await fsPromises.readdir(currDir);
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const stats = await fsPromises.stat(path.join(currDir, file));
                    if (stats.isDirectory()) {
                        const dir = file;
                        let isAssest = isAssestDir || dir === 'images' || dir === 'fonts';
                        fileList = await traverse(path.join(currDir, dir), isAssest);
                    } else if (stats.isFile()) {
                        const extension = path.extname(file);
                        const baseName = path.basename(file, extension);
                        const absolutePath = path.join(currDir, file);
                        const relativePath = path.relative(buildDir, absolutePath);

                        const details = {
                            absolutePath,
                            relativePath,
                        };

                        if (isAssestDir) {
                            let cHash = await this.getContentHash(absolutePath);
                            details['contentHash'] = cHash;
                            fileList[ZIP_TYPES.ASSETS].push(details);
                        } else if (/^(vendor)+(-|s~)/.test(baseName) || /^(runtime)+(-|s~)/.test(baseName)) {
                            // If vendor files then we should add it to low bucket
                            fileList[ZIP_TYPES.LOW].push(details);
                        } else {
                            if (extension === '.html') {
                                let cHash = await this.getContentHash(absolutePath);
                                details['contentHash'] = cHash;
                            }
                            fileList[ZIP_TYPES.HIGH].push(details);
                        }
                    }
                }

                return Promise.resolve(fileList);
            } catch (error) {
                return Promise.reject(error);
            }
        }
        try {
            return Promise.resolve(await traverse(buildDir));
        } catch (error) {
            return Promise.reject(error);
        }
        
    }

    async compareWithCache(newFilesList) {
        try {
            const exists = await fsExtra.pathExists(cacheFilePath);
            let modifiedDetails = {
                [ZIP_TYPES.ASSETS]: true,
                [ZIP_TYPES.LOW]: true,
                [ZIP_TYPES.HIGH]: true,
            };
            if (exists) {
                let cacheList = await fsExtra.readJson(cacheFilePath, FILE_ENCODING);
                compare: for (const key in ZIP_TYPES) {
                    const type = ZIP_TYPES[key];
                    if (!cacheList[type] || cacheList[type].length !== newFilesList[type].length) {
                        console.debug('Cachelist: ', cacheList[type]);
                        continue;
                    }

                    //Compare file names
                    let cacheFileNames = cacheList[type].map((c) => c.relativePath);
                    let currentFileNames = newFilesList[type].map((c) => c.relativePath);
                    let difference = currentFileNames.filter((x) => !cacheFileNames.includes(x));

                    if (difference.length) {
                        console.debug(`Difference in ${type}: `, difference);
                        continue;
                    }

                    if (type === ZIP_TYPES.HIGH) {
                        let cachedFiles = [];
                        let currentFiles = [];
                        cachedFiles = cacheList[type].filter(
                            (x) => path.extname(path.basename(x.relativePath)) === '.html'
                        );
                        currentFiles = newFilesList[type].filter(
                            (x) => path.extname(path.basename(x.relativePath)) === '.html'
                        );

                        for (let i = 0; i < cachedFiles.length; i++) {
                            const cachedFile = cachedFiles[i];
                            const newFile = currentFiles.find(element => cachedFile.relativePath === element.relativePath);
                            if (newFile !== undefined) {
                                if (cachedFile.contentHash !== newFile.contentHash) {
                                    console.debug(`Difference in contentHash ${type}: `, cachedFile, newFile);
                                    break;
                                } else {
                                    continue compare;
                                }
                            }
                        }
                    }
                    modifiedDetails[type] = false;
                }
            } else {

            }

            return Promise.resolve({ res: modifiedDetails, logs: undefined });

        } catch (error) {
            console.log(chalk.red(err));
            return Promise.reject(error);
        }
    }

    async copyFiles(fileList = [], baseDir) {
        try {
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                const dest = file.destPath
                    ? path.join(baseDir, file.destPath)
                    : path.join(baseDir, file.relativePath);
                await fsExtra.copy(file.absolutePath, dest);
            }
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    async createZipFiles(src, dest, name) {
        return new Promise(async (resolve, reject) => {
            try {
                await fsExtra.ensureDir(dest);
                let outputZip = path.join(dest, `${name}.zip`);
                let output = fs.createWriteStream(outputZip);
                let archive = archiver('zip');
        
                archive.pipe(output);
                archive.directory(src, false);
                archive.finalize();
        
                output.on('close', () => {
                    resolve(archive);
                });
                archive.on('error', (err) => {
                    reject(err);
                }); 
            } catch (error) {
                reject(error);
            }
            
        });
    }

    async constructFilesForNative() {
        const spinner = ora(chalk.blue(`Building Zip Files for native...`)).start();
        try {
            let list = await this.getFilesByZipType();
            const zipsContentHash = {};
            let { res, logs } = await this.compareWithCache(list);
            for (const key in ZIP_TYPES) {
                const type = ZIP_TYPES[key];
                if (res[type] && list[type].length) {
                    await this.copyFiles(list[type], TEMP_DIR_PATH);
                    await this.createZipFiles(
                        TEMP_DIR_PATH,
                        nativeProductionPath,
                        `${this.moduleName}_${type}`
                    );
                    await fsExtra.emptyDir(TEMP_DIR_PATH);
                    zipsContentHash[`${this.moduleName}_${type}.zip`] = 
                        await this.getContentHash(path.join(nativeProductionPath, `${this.moduleName}_${type}.zip`));
                    console.debug(`Content hash of zip: ${type}: `, zipsContentHash[`${this.moduleName}_${type}.zip`]);
                } else {
                    
                }
                
            }
            spinner.text = chalk.grey('Writing Zip cache...');
            await fsExtra.ensureFile(cacheFilePath);
            await fsExtra.writeJSON(cacheFilePath, list);
            
            await fsExtra.ensureFile(zipsContentHashFilePath);
            await fsExtra.writeJSON(zipsContentHashFilePath, zipsContentHash);
            spinner.succeed(chalk.green(`Built Zip Files for native...`));
        } catch (err) {
            spinner.fail(chalk.red(`Build Zip files for native failed`));
            throw new Error(err);
        }
    }

	// Define `apply` as its prototype method which is supplied with compiler as its argument
	apply(compiler) {
		// Specify the event hook to attach to
		compiler.hooks.done.tap('CreateZipsPlugin', () => {
			
            this.constructFilesForWeb();
            this.constructFilesForNative();
					
		})
	}
}

module.exports = CreateZipsPlugin;