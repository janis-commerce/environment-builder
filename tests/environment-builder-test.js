'use strict';

const assert = require('assert');
const path = require('path');
const MockFs = require('mock-fs');
const fs = require('fs');
const util = require('util');

const chmod = util.promisify(fs.chmod);

const sandbox = require('sinon').createSandbox();

const { EnvironmentBuilder } = require('./../lib');

before(() => {
	// Avoid showing messages in console during tests
	sandbox.stub(console, 'log').callsFake(() => true);
	sandbox.stub(console, 'error').callsFake(() => true);
});

after(() => {
	sandbox.restore();
});


describe('Exists', () => {
	let envBuilder;
	let directory;

	before(() => {
		MockFs({
			local: {
				'README.md': '# LOCAL'
			}
		});

		envBuilder = new EnvironmentBuilder();
	});

	after(() => {
		MockFs.restore();
	});

	it('should return TRUE when file path exist', async () => {
		directory = path.join(process.cwd(), 'local');

		assert(await envBuilder.exists(directory));
	});

	it('should return FALSE when file path not exist', async () => {
		directory = path.join(process.cwd(), 'sac');

		assert(!(await envBuilder.exists(directory)));
	});
});

describe('Is Empty Folder', () => {
	let envBuilder;
	let directory;

	before(() => {
		MockFs({
			environments: {
				local: {
					'README.md': '# LOCAL'
				},
				home: {}
			}
		});

		envBuilder = new EnvironmentBuilder();
	});

	after(() => {
		MockFs.restore();
	});

	it('should return TRUE when directory path exist and is empty', async () => {
		directory = path.join(process.cwd(), 'environments', 'home');

		assert(await envBuilder.isEmptyFolder(directory));
	});

	it('should return FALSE when directory path exist and is not empty', async () => {
		directory = path.join(process.cwd(), 'environments', 'local');

		assert(!(await envBuilder.isEmptyFolder(directory)));
	});

	it('should rejects when directory path not exist', async () => {
		directory = path.join(process.cwd(), 'environments', 'sac');

		await assert.rejects(envBuilder.isEmptyFolder(directory));
	});

	it('should rejects when directory have bad permissions', async () => {
		directory = path.join(process.cwd(), 'environments', 'local');

		chmod(path.join(process.cwd(), 'environments'), 0o000);
		await assert.rejects(envBuilder.isEmptyFolder(directory));
	});
});

describe('EnvironmentBuilder', () => {

	context('when some environments folders not exists or are empties', () => {

		let envBuilder;

		beforeEach(() => {
			envBuilder = new EnvironmentBuilder();
		});

		afterEach(() => {
			MockFs.restore();
		});

		it('should not create create config folder if \'root/environments\' not exist', async () => {

			await envBuilder.execute();
			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));

		});

		it('should not create create config folder if \'root/environments\' is empty', async () => {
			MockFs({
				environments: {} // empty folder
			});

			await envBuilder.execute();
			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));
		});

		it('should not create create config folder if \'root/environments/[ENVIRONMENT]\' not exist', async () => {
			MockFs({
				environments: {
					local: {
						'README.md': '# LOCAL'
					}
				}
			});

			await envBuilder.execute('sac');
			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));
		});

		it('should not create create config folder if \'root/environments/[ENVIRONMENT]\' is empty', async () => {
			MockFs({
				environments: {
					local: {} // empty folder
				}
			});

			await envBuilder.execute();
			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));
		});
	});

	context('when environments folders exists, config folder not', () => {
		let envBuilder;

		beforeEach(() => {
			envBuilder = new EnvironmentBuilder();
		});

		afterEach(() => {
			MockFs.restore();
		});

		it('should not replace create config folder if can\'t copy files', async () => {
			MockFs({
				environments: MockFs.directory({
					mode: 0o444,
					items: {
						local: {
							'README.md': '# LOCAL'
						}
					}
				})
			});

			// Config doesn't exist before
			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));

			await envBuilder.execute();

			// Config doesn't exist after
			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));
		});

		it('should create create config folder with \'local\' (no params passed) environment, only files', async () => {
			MockFs({
				environments: {
					local: {
						'LOCAL.md': '# LOCAL'
					},
					home: {
						'HOME.md': '# HOME'
					}
				}
			});

			// Config doesn't exist before
			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));

			await envBuilder.execute();

			const localFile = path.join(EnvironmentBuilder.configDir, 'LOCAL.md');
			const homeFile = path.join(EnvironmentBuilder.configDir, 'HOME.md');

			// Config exists after and is not empty
			assert(await envBuilder.exists(EnvironmentBuilder.configDir));
			assert(!(await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir)));

			// Config has the right file
			assert(await envBuilder.exists(localFile));
			assert(!(await envBuilder.exists(homeFile)));

		});

		it('should create create config folder with [ENVIRONMENT] (params passed) environment, only files', async () => {
			MockFs({
				environments: {
					local: {
						'LOCAL.md': '# LOCAL'
					},
					home: {
						'HOME.md': '# HOME'
					}
				}
			});

			// Config doesn't exist before
			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));

			await envBuilder.execute('home');

			const homeFile = path.join(EnvironmentBuilder.configDir, 'HOME.md');
			const localFile = path.join(EnvironmentBuilder.configDir, 'LOCAL.md');

			// Config exists after and is not empty
			assert(await envBuilder.exists(EnvironmentBuilder.configDir));
			assert(!(await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir)));

			// Config has the right file
			assert(await envBuilder.exists(homeFile));
			assert(!(await envBuilder.exists(localFile)));

		});

		it('should create create config folder with \'local\' environment, files amd sub-folders', async () => {
			MockFs({
				environments: {
					local: {
						'LOCAL.md': '# LOCAL',
						other: {
							'OTHER.md': '# LOCAL - OTHER'
						}
					},
					home: {
						'HOME.md': '# HOME',
						sweet: {
							'SWEET.md': '# HOME - SWEET'
						}
					}
				}
			});

			// Config doesn't exist before
			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));

			const homeFile = path.join(EnvironmentBuilder.configDir, 'HOME.md');
			const sweetDir = path.join(EnvironmentBuilder.configDir, 'sweet');
			const sweetFile = path.join(EnvironmentBuilder.configDir, 'sweet', 'SWEET.md');

			const localFile = path.join(EnvironmentBuilder.configDir, 'LOCAL.md');
			const otherDir = path.join(EnvironmentBuilder.configDir, 'other');
			const otherFile = path.join(EnvironmentBuilder.configDir, 'other', 'OTHER.md');

			await envBuilder.execute();

			// Config exists after and is not empty
			assert(await envBuilder.exists(EnvironmentBuilder.configDir));
			assert(!(await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir)));

			// Config has the right file
			assert(await envBuilder.exists(localFile));
			assert(await envBuilder.exists(otherDir));
			assert(await envBuilder.exists(otherFile));

			assert(!await envBuilder.exists(homeFile));
			assert(!await envBuilder.exists(sweetDir));
			assert(!await envBuilder.exists(sweetFile));

		});

		it('should create create config folder with [ENVIRONMENT] (params passed), files amd sub-folders', async () => {
			MockFs({
				environments: {
					local: {
						'LOCAL.md': '# LOCAL',
						other: {
							'OTHER.md': '# LOCAL - OTHER'
						}
					},
					home: {
						'HOME.md': '# HOME',
						sweet: {
							'SWEET.md': '# HOME - SWEET'
						}
					}
				}
			});

			// Config don't exit before
			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));

			const homeFile = path.join(EnvironmentBuilder.configDir, 'HOME.md');
			const sweetDir = path.join(EnvironmentBuilder.configDir, 'sweet');
			const sweetFile = path.join(EnvironmentBuilder.configDir, 'sweet', 'SWEET.md');

			const localFile = path.join(EnvironmentBuilder.configDir, 'LOCAL.md');
			const otherDir = path.join(EnvironmentBuilder.configDir, 'other');
			const otherFile = path.join(EnvironmentBuilder.configDir, 'other', 'OTHER.md');

			await envBuilder.execute('home');

			// Config exist after and is not empty
			assert(await envBuilder.exists(EnvironmentBuilder.configDir));
			assert(!(await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir)));

			// Have the right file
			assert(!await envBuilder.exists(localFile));
			assert(!await envBuilder.exists(otherDir));
			assert(!await envBuilder.exists(otherFile));

			assert(await envBuilder.exists(homeFile));
			assert(await envBuilder.exists(sweetDir));
			assert(await envBuilder.exists(sweetFile));

		});
	});

	context('when environments and config folders exists', () => {
		describe('config folder is empty', () => {
			let envBuilder;

			beforeEach(() => {
				envBuilder = new EnvironmentBuilder();
			});

			afterEach(() => {
				MockFs.restore();
			});

			it('should replace config folder with \'local\' (no params passed) environment, only files', async () => {
				MockFs({
					environments: {
						local: {
							'LOCAL.md': '# LOCAL'
						},
						home: {
							'HOME.md': '# HOME'
						}
					},
					config: {}
				});

				// Config exist before and it's empty
				assert(await envBuilder.exists(EnvironmentBuilder.configDir));
				assert(await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir));

				await envBuilder.execute();

				const localFile = path.join(EnvironmentBuilder.configDir, 'LOCAL.md');
				const homeFile = path.join(EnvironmentBuilder.configDir, 'HOME.md');

				// Config exist after, it's not empty
				assert(await envBuilder.exists(EnvironmentBuilder.configDir));
				assert(!await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir));

				// Config has the right file
				assert(await envBuilder.exists(localFile));
				assert(!await envBuilder.exists(homeFile));

			});

			it('should replace config folder with [ENVIRONMENT] (params passed) environment, only files', async () => {
				MockFs({
					environments: {
						local: {
							'LOCAL.md': '# LOCAL'
						},
						home: {
							'HOME.md': '# HOME'
						}
					},
					config: {}
				});

				// Config exist before and it's empty
				assert(await envBuilder.exists(EnvironmentBuilder.configDir));
				assert(await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir));

				await envBuilder.execute('home');

				const localFile = path.join(EnvironmentBuilder.configDir, 'LOCAL.md');
				const homeFile = path.join(EnvironmentBuilder.configDir, 'HOME.md');

				// Config exist after, it's not empty
				assert(await envBuilder.exists(EnvironmentBuilder.configDir));
				assert(!await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir));

				// Config has the right file
				assert(!await envBuilder.exists(localFile));
				assert(await envBuilder.exists(homeFile));

			});

			it('should replace config folder with \'local\' environment, files amd sub-folders', async () => {
				MockFs({
					environments: {
						local: {
							'LOCAL.md': '# LOCAL',
							other: {
								'OTHER.md': '# LOCAL - OTHER'
							}
						},
						home: {
							'HOME.md': '# HOME',
							sweet: {
								'SWEET.md': '# HOME - SWEET'
							}
						}
					},
					config: {}
				});

				// Config exists before and it's empty
				assert(await envBuilder.exists(EnvironmentBuilder.configDir));
				assert(await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir));

				const homeFile = path.join(EnvironmentBuilder.configDir, 'HOME.md');
				const sweetDir = path.join(EnvironmentBuilder.configDir, 'sweet');
				const sweetFile = path.join(EnvironmentBuilder.configDir, 'sweet', 'SWEET.md');

				const localFile = path.join(EnvironmentBuilder.configDir, 'LOCAL.md');
				const otherDir = path.join(EnvironmentBuilder.configDir, 'other');
				const otherFile = path.join(EnvironmentBuilder.configDir, 'other', 'OTHER.md');

				await envBuilder.execute();

				// Config exists after and is not empty
				assert(await envBuilder.exists(EnvironmentBuilder.configDir));
				assert(!(await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir)));

				// Config has the right file
				assert(await envBuilder.exists(localFile));
				assert(await envBuilder.exists(otherDir));
				assert(await envBuilder.exists(otherFile));

				assert(!await envBuilder.exists(homeFile));
				assert(!await envBuilder.exists(sweetDir));
				assert(!await envBuilder.exists(sweetFile));

			});

			it('should replace config folder with [ENVIRONMENT] (params passed), files amd sub-folders', async () => {
				MockFs({
					environments: {
						local: {
							'LOCAL.md': '# LOCAL',
							other: {
								'OTHER.md': '# LOCAL - OTHER'
							}
						},
						home: {
							'HOME.md': '# HOME',
							sweet: {
								'SWEET.md': '# HOME - SWEET'
							}
						}
					},
					config: {}
				});

				// Config exists before and it's empty
				assert(await envBuilder.exists(EnvironmentBuilder.configDir));
				assert(await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir));

				const homeFile = path.join(EnvironmentBuilder.configDir, 'HOME.md');
				const sweetDir = path.join(EnvironmentBuilder.configDir, 'sweet');
				const sweetFile = path.join(EnvironmentBuilder.configDir, 'sweet', 'SWEET.md');

				const localFile = path.join(EnvironmentBuilder.configDir, 'LOCAL.md');
				const otherDir = path.join(EnvironmentBuilder.configDir, 'other');
				const otherFile = path.join(EnvironmentBuilder.configDir, 'other', 'OTHER.md');

				await envBuilder.execute('home');

				// Config exists after and is not empty
				assert(await envBuilder.exists(EnvironmentBuilder.configDir));
				assert(!(await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir)));

				// Config has the right file
				assert(!await envBuilder.exists(localFile));
				assert(!await envBuilder.exists(otherDir));
				assert(!await envBuilder.exists(otherFile));

				assert(await envBuilder.exists(sweetDir));
				assert(await envBuilder.exists(homeFile));
				assert(await envBuilder.exists(sweetFile));

			});
		});

		describe('config folder is not empty', () => {
			let envBuilder;

			beforeEach(() => {
				envBuilder = new EnvironmentBuilder();
			});

			afterEach(() => {
				MockFs.restore();
			});

			it('should not replace config folder content if can\'t delete files in config', async () => {
				MockFs({
					environments: {
						local: {
							'LOCAL.md': '# LOCAL'
						},
						home: {
							'HOME.md': '# HOME'
						}
					},
					config: MockFs.directory({
						mode: 0o555,
						items: {
							'DEV.md': '# DEV MODE',
							keys: { 'KEY.txt': 'n03sUn4K3Y' }
						}
					})
				});

				// Config exists before and it's not empty
				assert(await envBuilder.exists(EnvironmentBuilder.configDir));
				assert(!await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir));

				const devFile = path.join(EnvironmentBuilder.configDir, 'DEV.md');
				const keysDir = path.join(EnvironmentBuilder.configDir, 'keys');
				const keysFile = path.join(EnvironmentBuilder.configDir, 'keys', 'KEY.txt');
				// Files exist in Config Before
				assert(await envBuilder.exists(devFile));
				assert(await envBuilder.exists(keysDir));
				assert(await envBuilder.exists(keysFile));

				// try to build 'local' environment
				await envBuilder.execute();

				// Config exists after and it's not empty
				assert(await envBuilder.exists(EnvironmentBuilder.configDir));
				assert(!await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir));

				// Should not have the new file
				const localFile = path.join(EnvironmentBuilder.configDir, 'LOCAL.md');
				assert(!await envBuilder.exists(localFile));

			});

			it('should replace config folder content with \'local\' (no params passed) environment', async () => {
				MockFs({
					environments: {
						local: {
							'LOCAL.md': '# LOCAL'
						},
						home: {
							'HOME.md': '# HOME'
						}
					},
					config: {
						'DEV.md': '# DEV MODE',
						keys: {
							'KEY.txt': 'n03sUn4K3Y'
						}
					}
				});

				// Config exists before and it's not empty
				assert(await envBuilder.exists(EnvironmentBuilder.configDir));
				assert(!await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir));

				const devFile = path.join(EnvironmentBuilder.configDir, 'DEV.md');
				const keysDir = path.join(EnvironmentBuilder.configDir, 'keys');
				const keysFile = path.join(EnvironmentBuilder.configDir, 'keys', 'KEY.txt');
				// Files exist in Config Before
				assert(await envBuilder.exists(devFile));
				assert(await envBuilder.exists(keysDir));
				assert(await envBuilder.exists(keysFile));

				// try to build 'local' environment
				await envBuilder.execute();

				// Config exists after and it's not empty
				assert(await envBuilder.exists(EnvironmentBuilder.configDir));
				assert(!await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir));

				// Files not exist in Config Before
				assert(!await envBuilder.exists(devFile));
				assert(!await envBuilder.exists(keysDir));
				assert(!await envBuilder.exists(keysFile));

				// Should not have the new file
				const localFile = path.join(EnvironmentBuilder.configDir, 'LOCAL.md');
				assert(await envBuilder.exists(localFile));

			});

			it('should replace config folder content with [ENVIRONMENT] (params passed) environment', async () => {
				MockFs({
					environments: {
						local: {
							'LOCAL.md': '# LOCAL'
						},
						home: {
							'HOME.md': '# HOME'
						}
					},
					config: {
						'DEV.md': '# DEV MODE',
						keys: {
							'KEY.txt': 'n03sUn4K3Y'
						}
					}
				});

				// Config exists before and it's not empty
				assert(await envBuilder.exists(EnvironmentBuilder.configDir));
				assert(!await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir));

				const devFile = path.join(EnvironmentBuilder.configDir, 'DEV.md');
				const keysDir = path.join(EnvironmentBuilder.configDir, 'keys');
				const keysFile = path.join(EnvironmentBuilder.configDir, 'keys', 'KEY.txt');
				// Files exist in Config Before
				assert(await envBuilder.exists(devFile));
				assert(await envBuilder.exists(keysDir));
				assert(await envBuilder.exists(keysFile));

				// try to build 'local' environment
				await envBuilder.execute('home');

				// Config exists after and it's not empty
				assert(await envBuilder.exists(EnvironmentBuilder.configDir));
				assert(!await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir));

				// Files not exist in Config Before
				assert(!await envBuilder.exists(devFile));
				assert(!await envBuilder.exists(keysDir));
				assert(!await envBuilder.exists(keysFile));

				// Should not have the new file
				const homeFile = path.join(EnvironmentBuilder.configDir, 'HOME.md');
				assert(await envBuilder.exists(homeFile));
			});
		});

	});

});

describe('index', () => {

	before(() => {
		sandbox.stub(EnvironmentBuilder.prototype, 'execute');
	});

	after(() => {
		sandbox.restore();
	});

	it('should run the index script without problems', () => {
		const index = require('./../index'); // eslint-disable-line
	});

});
