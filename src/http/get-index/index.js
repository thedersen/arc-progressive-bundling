require = require('esm')(module);
const {renderReactDocument} = require('@architect/views/document/html.js');
const Home = require('@architect/views/modules/components/home.js').default;

exports.handler = async function(req) {
  return {
    statusCode: 200,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/html; charset=utf8'
    },
    body: renderReactDocument({
      Component: Home,
      scripts: ['entry-home.js'],
    })
  }
}
