# Promise 简单实现

SO 上一个比较著名的答案: [Basic Javascript promise implementation attempt](http://stackoverflow.com/questions/23772801/basic-javascript-promise-implementation-attempt/23785244#23785244)

在线视频: [youku](http://v.youku.com/v_show/id_XMjY4MjM4MjA2MA==.html)

## Code

```javascript
'use strict';

const PENDING = Symbol();
const FULFILLED = Symbol();
const REJECTED = Symbol();

function Promisee(fn) {
  if (typeof fn != 'function') {
    throw new Error('resolver should be a function!');
  }

  let state = PENDING;
  let value = null;
  let handler = [];

  function fulfill(result) {
    state = FULFILLED;
    value = result;
    handler.forEach(next);
    handler = null;
  }

  function reject(err) {
    state = REJECTED;
    value = err;
    handler.forEach(next);
    handler = null;
  }

  function resolve(result) {
    try {
      let then = typeof result.then == 'function' ? result.then : null;
      if (then) {
        then.bind(result)(resolve, reject);
        return;
      }
      fulfill(result);
    } catch(err) {
      reject(err);
    }
  }

  function next({onFulfill, onReject}) {
    switch(state) {
      case FULFILLED:
        onFulfill && onFulfill(value);
        break;
      case REJECTED:
        onReject && onReject(value);
        break;
      case PENDING:
        handler.push({onFulfill, onReject});
    }
  }

  this.then = function (onFulfill, onReject) {
    return new Promisee((resolve, reject) => {
      next({
        onFulfill: (val) => {
          try {
            resolve(onFulfill(val));
          } catch (err) {

          }
        }, 
        onReject: (err) => {
          reject(onReject(val));
        }
      });
    });
  }  

  fn(resolve, reject);
}
```