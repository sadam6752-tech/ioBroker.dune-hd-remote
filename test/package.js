'use strict';

const path = require('node:path');
const { tests } = require('@iobroker/testing');

// Run package tests — point to adapter root
tests.packageFiles(path.join(__dirname, '..'));
