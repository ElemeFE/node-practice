'use strict';

const net = require('net');
const url = require('url');
const dns = require('dns');

async function request(addr, callback) {
  const URL = url.parse(addr);
  let req;
  try {
    req = await connect(URL.hostname, URL.port || 80);
    req.write(setHeaders({ URL }));

    let result = await getResult(req);
    let [res, body] = getRes(result);

    callback(null, res, body);
    req.end();
  } catch(err) {
    callback(err);
  }

}

function lookup(host) {
  return new Promise((resolve, reject) => {
    dns.lookup(host, (err, address, family) => {
      if (err) {
        return reject(err);
      }
      resolve(address);
    })
  })
}

function connect(host, port) {
  return new Promise((resolve) => {
    const req = net.createConnection({ host, port }, () => {
      resolve(req);
    });
  });
}

function getResult(req) {
  return new Promise((resolve, reject) => {
    const data = [];
    // TODO fix
    req.on('readable', () => {
      let chunk;
      while (null !== (chunk = req.read())) {
        data.push(chunk);
      }
      resolve(Buffer.concat(data).toString());
    });
    req.once('error', reject);
  });
}

function getRes(text) {
  let [head, body] = shiftBy(text, '\r\n\r\n');
  let headers = getHeaders(head.split('\r\n'));
  return [headers, body];
}

function setHeaders(opts) {
  let res = [];
  res.push(`GET ${opts.URL.pathname} HTTP/1.1`);
  res.push(`Host: ${opts.URL.hostname}`);
  res.push('User-Agent: curl/7.51.0; http-client/0.0.0;');
  res.push('Accept: */*');
  res.push('\r\n');
  return res.join('\r\n');
}

function getHeaders(lines) {
  let headers = { statusCode: 200 };
  let firstLine = lines.shift();
  let [proto, statusCode] = firstLine.split(' ');
  if (statusCode > 0) {
    headers.statusCode = +statusCode;
  } else {
    throw new Error(`Invalid status code: ${lines}`);
  }
  for (let line of lines) {
    let [key, value] = shiftBy(line, ':');
    if (key) headers[key] = value;
  }
  return headers;
}

function shiftBy(content, separator) {
  let i = content.indexOf(separator);
  if (i != -1) {
    return [ content.slice(0, i), content.slice(i + separator.length) ];
  }
  return [];
}

module.exports = request;