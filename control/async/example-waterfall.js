'use strict';

// const async = require('async');
const async = require('./async');
const {user, sign, resource} = require('./modelMock');

exports.login = (name, passwd, done) => {
  async.waterfall([
    function (next) {
      user.get(name, next);
    },
    function (user, next) {
      if (!user) {
        return next(new Error('user not found'));
      }
      if (passwd != user.passwd) {
        return next(new Error('wrong password'));
      }
      sign.up(name, next);
    },
    function (reward, next) {
      resource.add(name, reward, next);
    },
  ], done);
};

exports.login('Alan', '123456', (...args) => {
  console.log('over', args);
});
