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
	async execute() {
		// Capture of Parametre or assign Default Value and build the path
		const environment = process.argv[2] || DEFAULT_ENVIRONMENT;
		const environmentDir = path.join(ENVIRONMENTS_DIR, environment);

		console.log(`Building Environment '${environment}'...`);

		// Checks if path exist
		if(!(await this.exists(ENVIRONMENTS_DIR)) || !(await this.exists(environmentDir))) {
			console.log(`\nAn error ocurred.\n'${environmentDir}' doesn't exist.\nLeaving...\n`);
			return;
		}

		// checks if source folde is empty
		if(await this.isEmptyFolder(environmentDir)) {
			console.log(`\nAn error ocurred.\n'${environmentDir}' is empty.\nLeaving...\n`);
			return;
		}

		// If CONFIG has files
		if(await this.exists(CONFIG_DIR) && !(await this.isEmptyFolder(CONFIG_DIR)))
			await this.deleteDir(CONFIG_DIR); // Delete if have it

		// try to copy files
		try {
			await ncp(environmentDir, CONFIG_DIR);
			console.log(`\nEnviroment '${environment}' created.\n`);
		} catch(e) {
			console.log(`\nAn error ocurred.\nFails during copying files.\n ERROR: ${e.message}.\n Leaving...\n`);
		}

	}

	/**
	 * Delete a directory recursive. Asynchronously.
	 * @param {string} filePath Path to folder
	 * @returns {Promise<boolean>}
	 */
	async deleteDir(filePath) {
		try {
			await rmdir(filePath);
			return true;
		} catch(e) {
			return false;
		}
	}

	/**
	 * Returns if folder is empty asynchronously
	 * @param {string} filePath Path to folder
	 * @returns {Promise<boolean>}
	 */
	async isEmptyFolder(filePath) {

		try {
			await readDir(filePath);
			return false;
		} catch(e) {
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

		} catch(e) {
			return false;
		}

	}

}

module.exports = EnvironmentBuilder;
