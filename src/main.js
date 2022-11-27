import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import { animate, viewSetup } from './view';

if (ENV?.production === true) {
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'G-STP92EN2LF');
}

if (WebGL.isWebGLAvailable()) {
    viewSetup();
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
}