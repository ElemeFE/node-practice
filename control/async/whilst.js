'use strict';

// const async = require('async');
const async = require('./async');

let count = 0;
async.whilst(
  function () { return count < 5; },
  function (callback) {
    console.log('count', count++);
    setTimeout(callback, 1000);
  },
  function (err) {
    console.log('over');
  }
);
