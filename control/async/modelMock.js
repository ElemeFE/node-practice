'use strict';

exports.user = {
  get: (name, cb) => {
    if (name == 'Alan') {
      return cb(null, {
        name: 'Alan',
        passwd: '123456'
      });
    }
    cb();
  }
};

exports.sign = {
  up: (name, cb) => {
    cb(null, { money: 50 });
  }
};

exports.resource = {
  add: (name, reward, cb) => {
    cb();
  }
};
