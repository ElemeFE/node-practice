'use strict';

const fs = require('fs');
// const async = require('async');
const async = require('./async');
const request = require('request');

const sites = ['www.baidu.com','github.com','www.npmjs.com', 'www.zhihu.com'];

function downloadFavicon(site, next) {
  let addr = `https://${site}/favicon.ico`;
  let file = `./${site}.ico`;
  request.get(addr)
    .pipe(fs.createWriteStream(file))
    .on('error', (err) => {
      console.error(`${url} Download failed: ${err.message}`);
      next();
    })
    .on('finish', next);
}

async.each(sites, downloadFavicon, function (err) {
  if (err) {
    console.log('err', err);
  }
  console.log('over');
});
