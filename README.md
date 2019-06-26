# environment-builder

[![Build Status](https://travis-ci.org/janis-commerce/environment-builder.svg?branch=JCN-93-environment-builder)](https://travis-ci.org/janis-commerce/environment-builder)
[![Coverage Status](https://coveralls.io/repos/github/janis-commerce/environment-builder/badge.svg?branch=JCN-93-environment-builder)](https://coveralls.io/github/janis-commerce/environment-builder?branch=JCN-93-environment-builder)

Build the exclusive files of each environment in the right folder.

## Usage

In the console

```sh
npx @janiscommerce/environment-builder [ENVIRONMENT]
```
* `[ENVIRONMENT]` name of the *environment* you want to build. If it's empty will be *'local'*.
* The files will be copy in `/root/config/`.
* If there are files in `/root/config/` will be removed, and replace with the new ones.

## Configuration

The environments are located in the folder `/root/environments/[ENVIRONMENT]`, and each of the `[ENVIRONMENT]` has the configuration neccesary to be build.

 