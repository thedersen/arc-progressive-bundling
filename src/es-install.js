#!/usr/bin/env node
const {install, printStats} = require('esinstall');
const path = require('path');
const {existsSync} = require('fs');
const json = require('jsonfile');
const {updater} = require('@architect/utils');

async function installInto(folder) {
  const log = updater('esinstall');
  const {dependencies, esinstall = {}} = await json.readFile(
    path.join(folder, 'package.json')
  );
  if (!dependencies) {
    log.status('No dependencies in package.json - nothing to install');
    return;
  }

  const {include = [], exclude = []} = esinstall;
  const input = [...Object.keys(dependencies), ...include];

  if (input.includes('react') && input.includes('htm')) {
    input.push('htm/react');
  }

  if (input.includes('preact') && input.includes('htm')) {
    input.push('htm/preact');
  }

  if (input.includes('react-dom')) {
    input.push('react-dom/server');
  }

  const filteredInput = [
    ...new Set(input.filter((input) => !exclude.includes(input))),
  ];

  log.start(`Installing ${filteredInput.length} modules`);
  const {stats} = await install(filteredInput, {
    cwd: path.join(folder, 'modules'),
    verbose: false,
  });
  log.done(`Installed ${filteredInput.length} modules`);
  console.log(printStats(stats));
}

module.exports = async function () {
  try {
    const pathFromProjectRoot = path.join(process.cwd(), 'src', 'views');

    if (existsSync(path.join(pathFromProjectRoot, 'package.json'))) {
      return await installInto(pathFromProjectRoot);
    } else if (existsSync(path.join(process.cwd(), 'package.json'))) {
      return await installInto(process.cwd());
    } else {
      updater('esinstall').status('No package.json file found.');
    }
  } catch (error) {
    console.log(error);
  }
};
