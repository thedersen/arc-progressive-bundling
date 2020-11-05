import ReactDOM from './web_modules/react-dom.js';
import {html} from './web_modules/htm/react.js';
import Home from './components/home.js';

ReactDOM.render(html`<${Home} />`, document.querySelector('#root'));
