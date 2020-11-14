const path = require('path');
const sandbox = require('@architect/sandbox');
const {updater} = require('@architect/utils');
const browserSync = require('browser-sync');
const esInstall = require('./es-install.js');
const bundleFile = require('./bundler-function/bundle-file.js');

module.exports = async function ({bundle}) {
  const log = updater('ProgressiveBundling');

  await sandbox.start();

  const options = {
    open: false,
    ui: false,
    files: ['public/**/*', 'src/**/*.js'],
    watchOptions: {
      ignored: [
        'public/static.json',
        '**/node_modules/**',
        '**/package.json',
        '**/package-lock.json',
      ],
    },
    proxy: `localhost:${process.env.PORT}`,
  };
  if (bundle) {
    options.middleware = [
      {
        route: '/_modules',
        handle(request, response) {
          const start = process.hrtime();
          const mod = request.url.slice(1); // Remove leading /
          const filename = path.join(process.cwd(), 'src', 'views', 'modules', mod);
          log.start(`Bundling ${mod}`);
          bundleFile(filename).then((source) => {
            const end = process.hrtime(start);
            if (end[0] > 0) {
              log.done(`Bundled ${mod} in ${end[0]}.${Math.round(end[1]/1000000)}s`);
            } else {
              log.done(`Bundled ${mod} in ${Math.round(end[1]/1000000)}ms`);
            }
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

  const bs = browserSync.create();
  bs.init(options, () => {
    console.log(); // Add an empty line
    if (bundle) {
      log.status('Enabled Progressive Bundling');
    }
  });

  browserSync
    .create()
    .watch('src/views/package.json', {ignoreInitial: true}, () => {
      bs.pause();
      esInstall().then(() => {
        bs.resume()
      });
    });
};
