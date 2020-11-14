const rollup = require('rollup');
const path = require('path');
const sandbox = require('@architect/sandbox');
const {updater} = require('@architect/utils');
const browserSync = require('browser-sync');
const esInstall = require('./es-install.js');

async function bundleModule(module) {
  const input = path.join(process.cwd(), 'src', 'views', 'modules', module);
  const bundle = await rollup.rollup({input});
  const bundled = await bundle.generate({format: 'esm'});

  return bundled.output[0].code;
}

module.exports = async function ({bundle}) {
  const log = updater('ProgressiveBundling');

  await sandbox.start();

  const options = {
    open: false,
    ui: false,
    files: ['public/**/*', 'src/**/*.js'],
    ignore: [
      'public/static.json',
      'src/views/node_modules/**/*',
      'src/views/package.json',
    ],
    proxy: `localhost:${process.env.PORT}`,
  };
  if (bundle) {
    options.middleware = [
      {
        route: '/_modules',
        handle(request, response) {
          const mod = request.url.slice(1); // Remove leading /
          log.start(`Bundling ${mod}`);
          bundleModule(mod).then((source) => {
            log.done(`Bundled ${mod}`);
            response.writeHead(200, {'Content-Type': 'text/javascript'});
            response.write(source);
            response.end();
          });
        },
      },
    ];
  } else {
    options.serveStatic = [
      {
        route: '/_modules',
        dir: ['src/views/modules'],
      },
    ];
  }

  browserSync.create().init(options, () => {
    console.log(); // Add an empty line
    if (bundle) {
      log.status('Enabled Progressive Bundling');
    }
  });

  browserSync
    .create()
    .watch('src/views/package.json', {ignoreInitial: true}, () => {
      esInstall();
    });
};
