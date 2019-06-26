'use strict';

const assert = require('assert');

const sandbox = require('sinon').createSandbox();

const { EnvironmentBuilder } = require('./../lib');

describe('EnvironmentBuilder', () => {

	context('when nothing is testing', () => {
		it('should be ok', () => {
			sandbox.stub(EnvironmentBuilder.prototype, 'execute').returns(true);

			const envBuilder = new EnvironmentBuilder();

			assert(envBuilder.execute());

		});
	});

});
