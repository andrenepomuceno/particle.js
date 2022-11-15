import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import { guiSetup, animate, guiOptions } from './view';

if (WebGL.isWebGLAvailable()) {
    guiSetup();
    guiOptions.simulation.reset();
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
}