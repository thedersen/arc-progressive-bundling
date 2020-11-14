const {tables} = require('@architect/functions');
const {banner, toLogicalID, updater} = require('@architect/utils');

function chunk(array, chunkSize) {
  // eslint-disable-next-line unicorn/no-reduce
  return array.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / chunkSize);

    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = [];
    }

    resultArray[chunkIndex].push(item);

    return resultArray;
  }, []);
}

async function scanTable(data) {
  const parameters = {};
  const scanResults = [];

  let items;
  do {
    // eslint-disable-next-line no-await-in-loop
    items = await data['pb-cache'].scan(parameters);
    items.Items.forEach((item) => scanResults.push(item));
    parameters.ExclusiveStartKey = items.LastEvaluatedKey;
  } while (typeof items.LastEvaluatedKey !== 'undefined');

  return scanResults;
}

module.exports = async function (options) {
  const {dryRun, verbose, env} = options;

  if (dryRun) {
    const log = updater('ProgressiveBundling [dry-run]');
    log.status('Skipping purging progressive bundling cache');
    return;
  }

  const log = updater('ProgressiveBundling');

  // Banner also initializes AWS env vars. Quiet hides banner..
  const quiet = process.env.ARC_QUIET || process.env.QUIET;
  process.env.ARC_QUIET = true;
  banner({needsValidCreds: true});
  if (!quiet) {
    delete process.env.ARC_QUIET;
    delete process.env.QUIET;
  }

  const capEnv = env.charAt(0).toUpperCase() + env.slice(1);
  process.env.ARC_LOCAL = 1;
  process.env.NODE_ENV = env;
  process.env.ARC_CLOUDFORMATION = `${toLogicalID(
    process.env.ARC_APP_NAME
  )}${capEnv}`;

  const data = await tables();
  const items = await scanTable(data);
  if (items.length === 0) {
    log.status('Progressive Bundle Cache is empty - nothing to purge!');
  } else {
    log.start('Purging Progressive Bundle Cache');

    const chunks = chunk(items, 25); // Max 25 request items per batch write
    const tableName = data._name('pb-cache');

    await Promise.all(
      chunks.map((chunk) => {
        const keys = chunk.map((item) => item.key);
        const parameters = {
          RequestItems: {
            [tableName]: keys.map((key) => {
              return {
                DeleteRequest: {
                  Key: {
                    key,
                  },
                },
              };
            }),
          },
        };

        return data._doc
          .batchWrite(parameters)
          .promise()
          .catch((error) => log.error(error));
      })
    );

    const logLines = [];
    if (verbose) {
      items.forEach((item) => {
        logLines.push(`Purged ${item.key}`);
      });
    }

    logLines.push(`Purged ${items.length} files`);
    log.status('Purged Progressive Bundle Cache', ...logLines);
  }
};
