'use strict';

const fs = require('fs');
// const async = require('async');
const async = require('./async');
const request = require('request');

const sites = ['www.baidu.com','github.com','www.npmjs.com', 'www.zhihu.com'];

function downloadFavicon(site, next) {
  let url = `https://${site}/favicon.ico`;
  let ico = `./${site}.ico`;
  request.get(url)
    .pipe(fs.createWriteStream(ico))
    .on('error', (err) => {
      console.error(`${url} Download failed: ${err.message}`);
      next();
    })
    .on('finish', next);
}

async.eachLimit(sites, 2, downloadFavicon, function (err) {
  if (err) {
    console.log('err', err);
  }
  console.log('over');
});
