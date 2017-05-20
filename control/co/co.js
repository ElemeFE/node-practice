'use strict';

function co(gen) {
  let ctx = this;

  return new Promise((resolve, reject) => {
    if (typeof gen === 'function') gen = gen.apply(ctx);
    if (!gen || typeof gen.next !== 'function') return resolve(gen);

    run();

    function run(res) {
      let ret;
      try {
        ret = gen.next(res);
      } catch (e) {
        return reject(e);
      }
      next(ret);
    }

    function next(ret) {
      if (ret.done) return resolve(ret.value);
      let promise = ret.value;
      if (promise && typeof promise.then === 'function') {
        return promise.then(run);
      }

      reject('You may yield a Promise');
    }
  });
}

function sleep(sec) {
  return new Promise(function (done) {
    setTimeout(() => done(sec), sec)
  });
}

co(function * () {
  let res = yield sleep(1000);
  console.log('over', res)
});
