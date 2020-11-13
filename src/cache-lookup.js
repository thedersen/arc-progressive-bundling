const {tables} = require('@architect/functions');

async function cacheRead(filename) {
  const data = await tables();
  const cache = await data['pb-cache'].get({key: filename});

  return cache && cache.fileName;
}

module.exports = async function (src) {
  if (process.env.NODE_ENV === 'testing') {
    return src;
  }

  const cachedFilename = await cacheRead(src);
  if(cachedFilename) {
    return `/_static/${cachedFilename}`;
  }

  return src;
}
