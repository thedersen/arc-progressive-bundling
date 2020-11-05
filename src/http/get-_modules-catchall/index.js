const {createHash} = require('crypto');
const {join, parse} = require('path');
const {existsSync} = require('fs');
const {readFile, writeFile, mkdir} = require('fs/promises');
const {tables} = require('@architect/functions');
const rollup = require('rollup');

exports.handler = async function(req) {
  const module = req.pathParameters.proxy;
  const fullPath = getFullPath(module);

  if (req.queryParameters && req.queryParameters.pb === '0') {
    const js = await readFile(fullPath);

    return {
      statusCode: 200,
      headers: {
        'cache-control': 'no-store',
        'content-type': 'text/javascript; charset=utf8'
      },
      body: js.toString()
    }
  }

  const cachedFilename = await cacheRead(module);
  if (cachedFilename) {
    return {
      statusCode: 302,
      headers: {
        location: `/_static/${cacheFilename}`,
      }
    };
  };

  if (!cachedFilename) {
    if (!existsSync(fullPath)) {
      return {
        statusCode: 404
      }
    }
    const bundle = await bundleModule(module);
    const fileName = await cacheWrite(module, bundle);
    return {
      statusCode: 302,
      headers: {
        location: `/_static/${fileName}`,
      }
    };
  }
}

async function cacheRead(module) {
  const data = await tables();
  const cache = await data['pb-cache'].get({key: module});

  return cache && cache.fileName;
}

async function cacheWrite(module, source) {
  const hash = createHash('sha1');
  hash.update(Buffer.from(source));
  const sha = hash.digest('hex').substr(0, 7);
  const {dir, name, ext} = parse(module);
  const fingerprint = join(dir, `${name}-${sha}${ext}`);

  if (process.env.NODE_ENV === 'testing') {
    const pathToPublic = process.env.ARC_SANDBOX_PATH_TO_STATIC;
    await mkdir(join(pathToPublic, dir), {recursive: true});
    await writeFile(join(pathToPublic, fingerprint), source);
  } else {
    const s3 = new aws.S3();
    const result = await s3.putObject({
      ACL: 'public-read',
      Bucket: process.env.ARC_STATIC_BUCKET,
      Key: `${ process.env.ARC_STATIC_FOLDER }/${ fingerprint }`,
      Body: source,
      ContentType: `text/${ext === '.js'? 'javascript': 'css' }; charset=UTF-8`,
      CacheControl: 'max-age=315360000',
    }).promise();
  }

  const data = await tables();
  await data['pb-cache'].put({
    key: module,
    fileName: fingerprint,
  });

  return fingerprint;
}

async function bundleModule(module) {
  const input = getFullPath(module);
  const bundle = await rollup.rollup({ input })
  const bundled = await bundle.generate({ format: 'esm' })

  return bundled.output[0].code;
}

function getFullPath(module) {
  return join(
    process.cwd(),
    'node_modules',
    '@architect',
    'views',
    'modules',
    module
  );
}
