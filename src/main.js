import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import { animate, guiSetup, guiOptions } from './view';

if (WebGL.isWebGLAvailable()) {
    guiSetup();
    guiOptions.simulation.reset();
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
}