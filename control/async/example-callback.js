'use strict';

const {user, sign, resource} = require('./modelMock');

exports.login = function (name, passwd, done) {
  user.get(name, function (err, data) {
    if (err) {
      return done(err);
    }
    if (!data) {
      return done(new Error('user not found'));
    }
    if (passwd != data.passwd) {
      return done(new Error('wrong password'));
    }
    sign.up(name, function (err, reward) {
      if (err) {
        return done(err);
      }
      resource.add(name, reward, function (err) {
        if (err) {
          return done(err);
        }
        done();
      });
    });
  });
};

exports.login('Alan', '123456', (...args) => {
  console.log('over', args);
});
