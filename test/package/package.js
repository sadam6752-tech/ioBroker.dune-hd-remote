'use strict';

const path = require('node:path');
const { tests } = require('@iobroker/testing');

// Point to adapter root (two levels up from test/package/)
tests.packageFiles(path.join(__dirname, '..', '..'));
