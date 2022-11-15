import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import { guiSetup, animate } from './view';
import { simulationSetup } from './simulation';

if (WebGL.isWebGLAvailable()) {
    guiSetup();
    simulationSetup();
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
}