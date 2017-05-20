# async module

## Index

* [waterfall](#waterfall)
* [each](#each)
* [eachLimit](#eachlimit)
* [whilst](#whilst)

在线视频[地址](http://v.youku.com/v_show/id_XMjY2MjI5NzU5Ng==.html)

## waterfall

```javascript
exports.waterfall = function (task = [], callback = noop) {
  if (!Array.isArray(task)) {
    return callback(new Error('task should be an array!'));
  }

  (function next(...args) {
    if (args[0]) {
      return callback(args[0]);
    }

    if (task.length) {
      let fn = task.shift();
      fn.apply(null, [...args.slice(1), onlyOnce(next)]);
    } else {
      callback.apply(null, args);
    }
  })();
};
```

## each

```javascript
exports.each = function (items = [], iterator, callback = noop) {
  if (!Array.isArray(items)) {
    return callback(new Error('items should be an array!'));
  }

  if (typeof iterator != 'function') {
    return callback(new Error('iterator should be a function!'));
  }

  let completed = 0;

  function next(err) {
    if (err) {
      return callback(err);
    }

    if (++completed >= items.length) {
      callback();
    }
  }

  items.map((item) => iterator(item, next));
};
```

## eachLimit

```javascript
exports.eachLimit = function (items = [], limit = 1, iterator, callback = noop) {
  if (!Array.isArray(items)) {
    return callback(new Error('items should be an array!'));
  }

  if (typeof iterator != 'function') {
    return callback(new Error('iterator should be a function!'));
  }

  let done = false;
  let running = 0;
  let errored = false;

  (function next() {
    if (done && running <= 0) {
      return callback();
    }

    while (running < limit && !errored) {
      let item = items.shift();
      running++;
      if (item === undefined) {
        done = true;
        if (running <= 0) {
          callback();
        }
        return;
      }

      iterator(item, (err) => {
        running--;
        if (err) {
          errored = true;
          return callback(err);
        }
        next();
      });
    }
  })();
};
```

## whilst

```javascript
exports.whilst = function (test, iterator, callback = noop) {
  if (typeof test != 'function') {
    return callback(new Error('iterator should be a function!'));
  }
  if (typeof iterator != 'function') {
    return callback(new Error('iterator should be a function!'));
  }

  (function next() {
    if (test()) {
      iterator((err) => {
        if (err) {
          return callback(err);
        }
        next();
      });
    }
  })();
};
```
