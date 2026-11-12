'use strict';

const assert = require('assert');
const path = require('path');
const os = require('os');
const fs = require('fs');

const sandbox = require('sinon').createSandbox();

const EnvironmentBuilder = require('../lib/environment-builder');

const originalCwd = process.cwd();
let tmpDir;

/**
 * Creates a file tree (nested objects = directories, strings = file contents) inside the temporary directory
 * @param {object} tree
 * @param {string} base
 */
const createTree = (tree, base = tmpDir) => {
	Object.entries(tree).forEach(([name, content]) => {
		const target = path.join(base, name);

		if(typeof content === 'string')
			return fs.writeFileSync(target, content);

		fs.mkdirSync(target);
		createTree(content, target);
	});
};

const restorePermissions = dir => {
	if(!fs.existsSync(dir))
		return;

	fs.chmodSync(dir, 0o755);
	fs.readdirSync(dir, { withFileTypes: true })
		.filter(entry => entry.isDirectory())
		.forEach(entry => restorePermissions(path.join(dir, entry.name)));
};

beforeEach(() => {
	tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'environment-builder-')));
	process.chdir(tmpDir);
});

afterEach(() => {
	delete process.env.MS_PATH;
	process.chdir(originalCwd);
	restorePermissions(tmpDir);
	fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Exists', () => {
	let envBuilder;
	let directory;

	beforeEach(() => {
		createTree({
			local: {
				'README.md': '# LOCAL'
			}
		});

		envBuilder = new EnvironmentBuilder();
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

	beforeEach(() => {
		createTree({
			environments: {
				local: {
					'README.md': '# LOCAL'
				},
				home: {}
			}
		});

		envBuilder = new EnvironmentBuilder();
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

		fs.chmodSync(path.join(process.cwd(), 'environments'), 0o000);
		await assert.rejects(envBuilder.isEmptyFolder(directory));
	});
});

describe('EnvironmentBuilder', () => {

	context('when some environments folders not exists or are empties', () => {

		let envBuilder;
		let exit;

		beforeEach(() => {
			// Avoid showing messages in console during tests
			sandbox.stub(console, 'log').callsFake(() => true);
			sandbox.stub(console, 'error').callsFake(() => true);
			exit = sandbox.stub(process, 'exit');

			envBuilder = new EnvironmentBuilder();
		});

		afterEach(() => {
			sandbox.restore();
		});

		it('should not create config folder if \'root/environments\' not exist', async () => {

			await envBuilder.execute();

			sandbox.assert.calledOnce(exit);
			sandbox.assert.calledWith(exit, -1);

			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));

		});

		it('should not create config folder if \'root/environments\' is empty', async () => {
			createTree({
				environments: {} // empty folder
			});

			await envBuilder.execute();

			sandbox.assert.calledOnce(exit);
			sandbox.assert.calledWith(exit, -1);

			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));

		});

		it('should not create config folder if \'root/environments/[ENVIRONMENT]\' not exist', async () => {
			createTree({
				environments: {
					local: {
						'README.md': '# LOCAL'
					}
				}
			});

			await envBuilder.execute('sac');

			sandbox.assert.calledOnce(exit);
			sandbox.assert.calledWith(exit, -1);

			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));

		});

		it('should not create config folder if \'root/environments/[ENVIRONMENT]\' is empty', async () => {
			createTree({
				environments: {
					local: {} // empty folder
				}
			});

			await envBuilder.execute();

			sandbox.assert.calledOnce(exit);
			sandbox.assert.calledWith(exit, -1);

			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));

		});
	});

	context('when environments folders exists, config folder not', () => {
		let envBuilder;
		let exit;

		beforeEach(() => {
			// Avoid showing messages in console during tests
			sandbox.stub(console, 'log').callsFake(() => true);
			sandbox.stub(console, 'error').callsFake(() => true);
			exit = sandbox.stub(process, 'exit');

			envBuilder = new EnvironmentBuilder();
		});

		afterEach(() => {
			sandbox.restore();
		});

		it('should not replace config folder if can\'t copy files', async () => {
			createTree({
				environments: {
					local: {
						'README.md': '# LOCAL'
					}
				}
			});
			fs.chmodSync(path.join(tmpDir, 'environments'), 0o444);

			// Config doesn't exist before
			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));

			await envBuilder.execute();

			sandbox.assert.calledOnce(exit);
			sandbox.assert.calledWith(exit, -1);

			// Config doesn't exist after
			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));
		});

		it('should create config folder with \'local\' (no params passed) environment, only files', async () => {
			createTree({
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

		it('should create config folder with [ENVIRONMENT] (params passed) environment, only files', async () => {
			createTree({
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

		it('should create config folder with \'local\' environment, files amd sub-folders', async () => {
			createTree({
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

		it('should create config folder with [ENVIRONMENT] (params passed), files amd sub-folders', async () => {
			createTree({
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
				// Avoid showing messages in console during tests
				sandbox.stub(console, 'log').callsFake(() => true);
				sandbox.stub(console, 'error').callsFake(() => true);

				envBuilder = new EnvironmentBuilder();
			});

			afterEach(() => {
				sandbox.restore();
			});

			it('should replace config folder with \'local\' (no params passed) environment, only files', async () => {
				createTree({
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
				createTree({
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
				createTree({
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
				createTree({
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
			let exit;

			beforeEach(() => {
				// Avoid showing messages in console during tests
				sandbox.stub(console, 'log').callsFake(() => true);
				sandbox.stub(console, 'error').callsFake(() => true);
				exit = sandbox.stub(process, 'exit');

				envBuilder = new EnvironmentBuilder();
			});

			afterEach(() => {
				sandbox.restore();
			});

			it('should not replace config folder content if can\'t delete files in config', async () => {
				createTree({
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
						keys: { 'KEY.txt': 'n03sUn4K3Y' }
					}
				});
				fs.chmodSync(path.join(tmpDir, 'config'), 0o555);

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

				sandbox.assert.calledOnce(exit);
				sandbox.assert.calledWith(exit, -1);

				// Config exists after and it's not empty
				assert(await envBuilder.exists(EnvironmentBuilder.configDir));
				assert(!await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir));

				// Should not have the new file
				const localFile = path.join(EnvironmentBuilder.configDir, 'LOCAL.md');
				assert(!await envBuilder.exists(localFile));

			});

			it('should replace config folder content with \'local\' (no params passed) environment', async () => {
				createTree({
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
				createTree({
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

	context('when process.env.MS_PATH is setted', () => {
		let envBuilder;

		beforeEach(() => {

			sandbox.stub(console, 'log').callsFake(() => true);
			sandbox.stub(console, 'error').callsFake(() => true);

			envBuilder = new EnvironmentBuilder();

			createTree({
				sac: {
					environments: {
						local: {
							'LOCAL.md': '# LOCAL'
						},
						home: {
							'HOME.md': '# HOME'
						}
					}
				}
			});
		});

		afterEach(() => {
			sandbox.restore();
		});

		it('should build default environment', async () => {
			process.env.MS_PATH = 'sac';

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

		it('should build \'home\' environment', async () => {
			process.env.MS_PATH = 'sac';

			// Config doesn't exist before
			assert(!(await envBuilder.exists(EnvironmentBuilder.configDir)));

			await envBuilder.execute('home');

			const localFile = path.join(EnvironmentBuilder.configDir, 'LOCAL.md');
			const homeFile = path.join(EnvironmentBuilder.configDir, 'HOME.md');

			// Config exists after and is not empty
			assert(await envBuilder.exists(EnvironmentBuilder.configDir));
			assert(!(await envBuilder.isEmptyFolder(EnvironmentBuilder.configDir)));

			// Config has the right file
			assert(!await envBuilder.exists(localFile));
			assert(await envBuilder.exists(homeFile));

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
		const index = require('../index'); // eslint-disable-line
	});

});
