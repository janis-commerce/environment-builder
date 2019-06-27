'use strict';

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const rmdir = promisify(require('rimraf'));
const ncp = promisify(require('ncp').ncp);

const readDir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const ENVIRONMENTS_DIR = path.join(process.cwd(), 'environments');
const CONFIG_DIR = path.join(process.cwd(), 'config');
const DEFAULT_ENVIRONMENT = 'local';

/**
 * Simple Console Log
 * @param {string} message DEFAULT = 'Something happened'
 * @param {string} prefix DEFAULT = 'BUILDING'
 * @param {boolean} error
 */
/* isntabul ignore */
const logger = (message = 'Something happened', prefix = 'BUILDING', error = false) => {
	if(error) {
		console.error(`[ENV-BUILDER | ${new Date().toLocaleTimeString()}] : ${prefix} | ${message}`);
		console.error(`[ENV-BUILDER | ${new Date().toLocaleTimeString()}] : ERROR | Abort. Can't create ENVIRONMENT.\n`);
	} else
		console.log(`[ENV-BUILDER | ${new Date().toLocaleTimeString()}] : ${prefix} | ${message}`);
};

class EnvironmentBuilder {

	/**
	 * Execute de Builder
	 */
	async execute(environment = DEFAULT_ENVIRONMENT) {
		// Capture of Parametre or assign Default Value and build the path
		const environmentDir = path.join(ENVIRONMENTS_DIR, environment);

		logger(`Building Environment - '${environment}'`, 'START');

		// Checks if path exist
		if(!(await this.exists(ENVIRONMENTS_DIR)) || !(await this.exists(environmentDir))) {
			logger(`Directory: '${environmentDir}' doesn't exist.`, 'ERROR', true);
			return;
		}

		// checks if source folde is empty
		if(await this.isEmptyFolder(environmentDir)) {
			logger(`Directory: '${environmentDir}' is empty.`, 'ERROR', true);
			return;
		}

		logger(`Environment '${environment}' directory found.`);

		try {
			// If CONFIG has files
			if(await this.exists(CONFIG_DIR) && !(await this.isEmptyFolder(CONFIG_DIR))) {
				// Delete if have it
				logger('Previous Enviromment\'s Config folder found. Deleting.');
				await rmdir(CONFIG_DIR);
				logger('Delete previous Enviromment\'s Config.');
			}

			// try to copy files
			logger(`Copying '${environment}' files to '${CONFIG_DIR}'.`);
			await ncp(environmentDir, CONFIG_DIR);
			logger(`'${environment}' files copied to '${CONFIG_DIR}'.`);

			logger(`Environment '${environment}' created.\n`, 'SUCCESS');
		} catch(e) {
			logger(`${e.message}.`, 'ERROR', true);
		}

	}

	/**
	 * Returns if folder is empty asynchronously
	 * @param {string} filePath Path to folder
	 * @returns {Promise<boolean>}
	 */
	async isEmptyFolder(filePath) {

		try {
			const files = await readDir(filePath);
			return !files.length;
		} catch(error) {
			return true;
		}
	}

	/**
	 * Return if exist or not a File or directory asynchronously
	 * @param {string} filePath Path of File
	 * @returns {Promise<boolean>}
	 */
	async exists(filePath) {

		try {
			await stat(filePath);
			return true;
		} catch(error) {
			return false;
		}
	}

}

module.exports = EnvironmentBuilder;
