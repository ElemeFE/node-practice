const Promisee = require('./promisee');

function sleep(sec) {
  return new Promisee((resolve, reject) => {
    setTimeout(() => resolve(sec), sec * 1000);
  });
}

let p = new Promisee((resolve, reject) => {
  resolve('hello' + Math.random());
});

p
  .then((val) => {
    console.log(val);
    return sleep(3);
  })
  .then((val) => {
    return 'world';
  })
  .then((val) => {
    console.log(val);
    return sleep(3);
  })
  .then(() => {
    console.log('over');
  })

