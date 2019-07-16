'use strict';

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const rmdir = promisify(require('rimraf'));
const ncp = promisify(require('ncp').ncp);

const readDir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const ENVIRONMENTS_DIR = 'environments';
const CONFIG_DIR = 'config';
const DEFAULT_ENVIRONMENT = 'local';

/**
 * Simple Console Log
 * @param {string} message DEFAULT = 'Something happened'
 * @param {string} prefix DEFAULT = 'BUILDING'
 * @param {boolean} error if it's an error message
 */
/* istanbul ignore next */
const logger = (message = 'Something happened', prefix = 'BUILDING', error = false) => {
	const time = new Date().toLocaleTimeString();

	/*
		/x1b[**m -> text editor codes
		/x1b[35m = Magenta
		/x1b[32m = Green
		/x1b[31m = Red
		/x1b[1m = Bright
		/x1b[0m = Reset, back to normal
	 */

	if(error) {
		console.error(`[\x1b[35m \x1b[1mENV-BUILDER\x1b[0m | ${time} ] | \x1b[31m${prefix}\x1b[0m | ${message}`);
		console.error(`[\x1b[35m \x1b[1mENV-BUILDER\x1b[0m | ${time} ] | \x1b[31mERROR\x1b[0m | Abort. Can't create ENVIRONMENT.\n`);
	} else
		console.log(`[\x1b[35m \x1b[1mENV-BUILDER\x1b[0m | ${time} ] | \x1b[32m${prefix}\x1b[0m | ${message}`);
};

class EnvironmentBuilder {
	static get envDir() {
		const prefix = typeof process.env.MS_PATH === 'string' ? process.env.MS_PATH : '';
		return path.join(process.cwd(), prefix, ENVIRONMENTS_DIR);
	}

	static get configDir() {
		const prefix = typeof process.env.MS_PATH === 'string' ? process.env.MS_PATH : '';
		return path.join(process.cwd(), prefix, CONFIG_DIR);
	}

	static get defaultEnv() {
		return DEFAULT_ENVIRONMENT;
	}

	/**
	 * Execute de Builder
	 */
	async execute(environment = this.constructor.defaultEnv) {
		// Capture of Parametre or assign Default Value and build the path
		const environmentDir = path.join(this.constructor.envDir, environment);

		logger(`Building Environment - '${environment}'`, 'START');
		try {
			// Checks if path exist
			if(!(await this.exists(this.constructor.envDir)) || !(await this.exists(environmentDir))) {
				logger(`Directory: '${environmentDir}' doesn't exist.`, 'ERROR', true);
				return;
			}

			// checks if source folde is empty
			if(await this.isEmptyFolder(environmentDir)) {
				logger(`Directory: '${environmentDir}' is empty.`, 'ERROR', true);
				return;
			}

			logger(`Environment '${environment}' directory found.`);

			// If CONFIG has files
			if(await this.exists(this.constructor.configDir) && !(await this.isEmptyFolder(this.constructor.configDir))) {
				// Delete if have it
				logger('Previous Enviromment\'s Config folder found. Deleting.');
				await rmdir(this.constructor.configDir);
				logger('Delete previous Enviromment\'s Config.');
			}

			// try to copy files
			logger(`Copying '${environment}' files to '${this.constructor.configDir}'.`);
			await ncp(environmentDir, this.constructor.configDir);
			logger(`'${environment}' files copied to '${this.constructor.configDir}'.`);

			logger(`Environment '${environment}' created.\n`, 'SUCCESS');
		} catch(error) {
			logger(`${error.message}.`, 'ERROR', true);
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
			// if file not exist or have permission problems
			throw error;
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
