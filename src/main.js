import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import { viewSetup } from './view';

export const start = () => {
    if (ENV?.production === true) {
        function analytics() {
            window.dataLayer = window.dataLayer || [];
            function gtag() { dataLayer.push(arguments); }
            gtag('js', new Date());
            gtag('config', 'G-STP92EN2LF');
        }
        new Promise(analytics);
    }
    
    if (ENV?.version != false) {
        let dom = document.getElementById('info');
        dom.innerHTML = dom.innerHTML.replace('loading...', ENV?.version);
    }
    
    if (WebGL.isWebGL2Available()) {
        viewSetup();
    } else {
        const warning = WebGL.getWebGLErrorMessage();
        document.getElementById('renderer-container').appendChild(warning);
    }
}