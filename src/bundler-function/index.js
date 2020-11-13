const aws = require('aws-sdk');
const {createHash} = require('crypto');
const path = require('path');
const {existsSync} = require('fs');
const {tables} = require('@architect/functions');
const rollup = require('rollup');

exports.handler = async function (request) {
  const module = request.pathParameters.proxy;
  const cachedFilename = await cacheRead(module);

  if (cachedFilename) {
    return {
      statusCode: 302,
      headers: {
        location: `/_static/${cachedFilename}`,
      },
    };
  }

  if (!existsSync(getFullPath(module))) {
    return {
      statusCode: 404,
    };
  }

  const bundle = await bundleModule(module);
  const fileName = await cacheWrite(module, bundle);
  return {
    statusCode: 302,
    headers: {
      location: `/_static/${fileName}`,
    },
  };
};

async function cacheRead(module) {
  const data = await tables();
  const cache = await data['pb-cache'].get({key: module});

  return cache && cache.fileName;
}

async function cacheWrite(module, source) {
  const hash = createHash('sha1');
  hash.update(Buffer.from(source));
  const sha = hash.digest('hex').slice(0, 7);
  const {dir, name, ext} = path.parse(module);
  const fingerprint = path.join(dir, `${name}-${sha}${ext}`);

  const s3 = new aws.S3();
  await s3
    .putObject({
      ACL: 'public-read',
      Bucket: process.env.ARC_STATIC_BUCKET,
      Key: fingerprint,
      Body: source,
      ContentType: `text/${
        ext === '.js' ? 'javascript' : 'css'
      }; charset=UTF-8`,
      CacheControl: 'max-age=315360000',
    })
    .promise();

  const data = await tables();
  await data['pb-cache'].put({
    key: module,
    fileName: fingerprint,
  });

  return fingerprint;
}

async function bundleModule(module) {
  const input = getFullPath(module);
  const bundle = await rollup.rollup({input});
  const bundled = await bundle.generate({format: 'esm'});

  return bundled.output[0].code;
}

function getFullPath(module) {
  return path.join(process.cwd(), 'modules', module);
}
