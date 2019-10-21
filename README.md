# environment-builder

[![Build Status](https://travis-ci.org/janis-commerce/environment-builder.svg?branch=master)](https://travis-ci.org/janis-commerce/environment-builder)
[![Coverage Status](https://coveralls.io/repos/github/janis-commerce/environment-builder/badge.svg?branch=master)](https://coveralls.io/github/janis-commerce/environment-builder?branch=master)

Build the exclusive files of each environment in the right config folder.

## Usage (command line)

In the console

```sh
npx @janiscommerce/environment-builder [ENVIRONMENT]
```
* `[ENVIRONMENT]` name of the *environment* you want to build. If it's empty will be *'local'*.
* The files will be copy in `/root/config/`.
* If there are files in `/root/config/` will be removed, and replace with the new ones.

## Configuration

The environments should be located in the folder `/root/environments/[ENVIRONMENT]`. It mustn't be empty.

## Usage (module)

```js
const EnvironmentBuilder = require('@janiscommerce/environment-builder');
```

## API

### **`new EnvironmentBuilder()`**
Constructs the EnvironmentBuilder instance.

### ***async*** **`execute(environment)`**
Builds the environment for the specified `environment [String]`.

## Examples
```js
const EnvironmentBuilder = require('@janiscommerce/environment-builder');

const environmentBuilder = new EnvironmentBuilder();

(async () => {

	await environmentBuilder.execute('local');

})();
```