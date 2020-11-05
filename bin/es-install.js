#!/usr/bin/env node
const {install, printStats} = require('esinstall');
const {join} = require('path');
const json = require('jsonfile');

module.exports = async function () {
  try {
    const package = await json.readFile(join(process.cwd(), '/src/views/package.json'));
    const {dependencies, esinstall = {}} = package;
    if (!dependencies) {
      console.log('[esinstall] No dependencies in package.json');
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

    const filteredInput = [...new Set(input.filter(input => !exclude.includes(input)))];

    console.log('[esinstall] Installing ', filteredInput);
    const {stats} = await install(filteredInput, {
      cwd: join(process.cwd(), '/src/views/modules'),
      verbose: false,
    });
    console.log(printStats(stats));

  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log('[esinstall] No package.json found in src/views');
    } else {
      console.log(e);
    }
  }
}