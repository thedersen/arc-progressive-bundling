const esbuild = require('esbuild');

module.exports = async function(filename) {
  const result = await esbuild.build({
    entryPoints: [filename],
    bundle: true,
    write: false,
    minify: true,
    sourcemap: process.env.NODE_ENV === 'testing',
    format: 'esm',
  });

  return result.outputFiles[0].contents;
}
