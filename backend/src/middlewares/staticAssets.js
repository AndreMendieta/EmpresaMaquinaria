const path = require('path');
const express = require('express');

const assetsPath = path.resolve(__dirname, '../../../assets');

module.exports = express.static(assetsPath, {
  fallthrough: false,
  index: false,
  maxAge: '1d',
});
