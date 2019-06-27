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

class EnvironmentBuilder {

	/**
	 * Execute de Builder
	 */
	async execute(environment = DEFAULT_ENVIRONMENT) {
		// Capture of Parametre or assign Default Value and build the path
		const environmentDir = path.join(ENVIRONMENTS_DIR, environment);

		console.log(`\n[${new Date().toLocaleTimeString()}] : Building Environment - '${environment}'`);

		// Checks if path exist
		if(!(await this.exists(ENVIRONMENTS_DIR)) || !(await this.exists(environmentDir))) {
			console.error(`[${new Date().toLocaleTimeString()}] : ERROR | Directory: '${environmentDir}' doesn't exist. Abort.\n`);
			return;
		}

		// checks if source folde is empty
		if(await this.isEmptyFolder(environmentDir)) {
			console.error(`[${new Date().toLocaleTimeString()}] : ERROR | Directory: '${environmentDir}' is empty. Abort.\n`);
			return;
		}

		console.log(`[${new Date().toLocaleTimeString()}] : Environment '${environment}' 's directory found.`);

		try {
			// If CONFIG has files
			if(await this.exists(CONFIG_DIR) && !(await this.isEmptyFolder(CONFIG_DIR))) {
				await rmdir(CONFIG_DIR); // Delete if have it
				console.log(`[${new Date().toLocaleTimeString()}] : Delete previous Enviromment's Config.`);
			}

			// try to copy files
			await ncp(environmentDir, CONFIG_DIR);

			console.log(`[${new Date().toLocaleTimeString()}] : SUCCESS | Environment '${environment}' created.\n`);
		} catch(e) {
			console.error(`[${new Date().toLocaleTimeString()}] : ERROR | ${e.message}. Abort.\n`);
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
