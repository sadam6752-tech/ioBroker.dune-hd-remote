'use strict';

const { tests } = require('@iobroker/testing');
const path = require('path');

// Run package tests — point to adapter root
tests.packageFiles(path.join(__dirname, '../..'), { /* options */ });
