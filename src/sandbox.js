const sandbox = require('@architect/sandbox');
const browserSync = require('browser-sync');
const esInstall = require('./es-install.js');

module.exports = async function () {
  await sandbox.start();

  browserSync.create().init({
    open: false,
    ui: false,
    files: ['public/**/*', 'src/**/*.js'],
    ignore: [
      'public/static.json',
      'src/views/node_modules/**/*',
      'src/views/package.json',
    ],
    proxy: `localhost:${process.env.PORT}`,
    serveStatic: [
      {
        route: '/_modules',
        dir: ['src/views/modules'],
      },
    ],
  });

  browserSync
    .create()
    .watch('src/views/package.json', {ignoreInitial: true}, () => {
      esInstall();
    });
};
