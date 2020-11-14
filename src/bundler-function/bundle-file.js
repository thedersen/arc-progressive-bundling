const rollup = require('rollup');

module.exports = async function(filename) {
  const bundle = await rollup.rollup({input: filename});
  const bundled = await bundle.generate({format: 'esm'});

  return bundled.output[0].code;
}
