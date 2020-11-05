const {renderToString} = require('../modules/web_modules/react-dom/server.js');
const {html} = require('../modules/web_modules/htm/react.js');

export function renderDocument(props = {}) {
  const {
    children,
    scripts = [],
  } = props;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<link rel="stylesheet" href="/_static/site.css">
${scripts.map(src => `<script src=/_modules/${src} type="module" crossorigin defer></script>`)}
</head>
<body>
  <div id="root">
    ${children}
  </div>
</body>
</html>
`
}

export function renderReactDocument(props = {}) {
  const {
    Component,
    ...rest
  } = props;

  const newProps = {
    children: renderToString(html`<${Component} />`),
    ...rest
  };
  return renderDocument(newProps);
}
