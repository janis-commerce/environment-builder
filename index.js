#!/usr/bin/env node

'use strict';

const EnvironmentBuilder = require('./lib/environment-builder');

(async () => {
	const envBuilder = new EnvironmentBuilder();
	await envBuilder.execute(process.argv[2]);
})();
