import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import { viewSetup } from './simulation/view';

const simulationStart = () => {
    if (WebGL.isWebGL2Available()) {
        viewSetup();

        if (ENV?.version) {
            let dom = document.getElementById('info');
            dom.innerHTML = dom.innerHTML.replace('loading...', ENV?.version);
        }
    } else {
        const warning = WebGL.getWebGL2ErrorMessage();
        document.getElementById('root').appendChild(warning);
    }
}

function analytics() {
    if (ENV?.production === true) {
        const analytics = () => {
            window.dataLayer = window.dataLayer || [];
            function gtag() { dataLayer.push(arguments); }
            gtag('js', new Date());
            gtag('config', ENV?.gtag_config);
        }
        new Promise(analytics);
    }
}

function main() {
    analytics();
    simulationStart();
}

main();