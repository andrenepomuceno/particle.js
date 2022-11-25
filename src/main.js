import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import { animate, guiSetup, guiOptions } from './view';

if (ENV?.production === true) {
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'G-STP92EN2LF');
}

if (WebGL.isWebGLAvailable()) {
    guiSetup();
    guiOptions.simulation.reset();
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
}