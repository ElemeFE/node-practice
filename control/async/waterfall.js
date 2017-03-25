'use strict';

// const async = require('async');
const async = require('./async');

async.waterfall([
    function(next) {
        next(null, 'one', 'two');
    },
    function(arg1, arg2, next) {
        console.log(arg1);
        console.log(arg2);
        // arg1 now equals 'one' and arg2 now equals 'two'
        next(null, 'three');
    },
    function(arg1, next) {
        console.log(arg1);
        // arg1 now equals 'three'
        next(null, 'done');
    }
], function (err, result) {
    // result now equals 'done'
    console.log(err, result);
});
