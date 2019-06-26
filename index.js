'use strict';

const { EnvironmentBuilder } = require('./lib');

(async () => {
	const envBuilder = new EnvironmentBuilder();
	await envBuilder.execute();
})();
