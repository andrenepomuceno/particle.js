import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import { animate, guiSetup } from './view';

if (ENV?.production === true) {
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'G-STP92EN2LF');
}

if (ENV?.version) {
    let dom = document.getElementById("info");
    dom.innerHTML = dom.innerHTML.replace("loading...", ENV?.version);
}

if (WebGL.isWebGLAvailable()) {
    guiSetup();
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
}