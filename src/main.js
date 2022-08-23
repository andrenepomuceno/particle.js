import * as $ from 'jquery';
import WebGL from 'three/examples/jsm/capabilities/WebGL.js';

import { Graphics } from './graphics.js'
import {
    simulationSetup, simulationStep, simulationCleanup,
    particleList, toogleChargeColor
} from './simulation.js';
import { Vector2 } from 'three';

const graphics = new Graphics();
let hideText = false;
let hideAxis = false;
let nextFrame = false;
let pause = false;

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
            simulationCleanup(graphics);
            simulationSetup(graphics);
            break;

        default:
            if (key >= '0' && key <= '9') {
                pause = true;
                let idx = key - '0' - 1;
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

let pointer = new Vector2(1e5, 1e5);
window.addEventListener('pointermove', function (event) {
    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
});

function animate() {
    requestAnimationFrame(animate);

    if (pause) {
        graphics.raycast(pointer);
    }

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