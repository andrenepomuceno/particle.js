import * as $ from 'jquery';
import WebGL from 'three/examples/jsm/capabilities/WebGL.js';

import { Graphics } from './graphics.js'
import {
    simulationSetup, simulationStep, simulationCleanup, 
    particleList, toogleChargeColor
} from './simulation.js';

const graphics = new Graphics();
let hideText = false;
let hideAxis = false;
let nextFrame = false;
let pause = true;

document.addEventListener("keydown", (event) => {
    let key = event.key;
    switch (key) {
        case ' ':
            pause = !pause;
            break;

        case 'c':
            graphics.controls.reset();
            break;

        case 'r':
            simulationCleanup(graphics);
            simulationSetup(graphics);
            break;

        case 'p':
            particleList.forEach((p, i) => {
                p.print();
            });
            break;

        case 'h':
            hideText = !hideText;
            $(".text").css("opacity", hideText ? 0 : 100);
            graphics.stats.dom.style.display = hideText ? "none" : "block";
            break;

        case 'a':
            hideAxis = !hideAxis;
            graphics.showAxis(!hideAxis);
            break;

        case 'v':
            graphics.camera.position.set(0, 0, graphics.cameraDistance);
            graphics.controls.update();
            graphics.controls.target.set(0, 0, 0);
            break;

        case 'n':
            nextFrame = true;
            break;

        case 'q':
            toogleChargeColor();
            particleList.forEach((p, i) => {
                graphics.scene.remove(p.sphere);
            });
            simulationCleanup(graphics);
            simulationSetup(graphics);
            break;

        case '_':
            pause = true;
            simulationCleanup(graphics);
            simulationSetup(graphics, 99);
            break;

        default:
            if (key >= '0' && key <= '9') {
                pause = true;
                let idx = key - '0';
                simulationCleanup(graphics);
                simulationSetup(graphics, idx);
            }
            break;

    }
})

window.onresize = function () {
    graphics.camera.aspect = window.innerWidth / window.innerHeight;
    graphics.camera.updateProjectionMatrix();
    graphics.renderer.setSize(window.innerWidth, window.innerHeight);
};

function animate() {
    requestAnimationFrame(animate);

    graphics.update();

    if (!pause || nextFrame) {
        nextFrame = false;
        simulationStep(graphics);
    }
}

if (WebGL.isWebGLAvailable()) {
    simulationSetup(graphics);
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
}