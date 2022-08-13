import * as $ from 'jquery';
import WebGL from 'three/examples/jsm/capabilities/WebGL.js';

import { Graphics } from './graphics.js'
import { 
    sceneSetup, simulate, cleanup, particleList, toogleChargeColor,
    simulationAtom,
    simulation0,
    simulation1,
    simulationCross,
    simulationGrid2D,
    simulationGrid3D,
    simulationSpheres,
    colisionTest
} from './simulation.js';

const graphics = new Graphics();
let hideText = false;
let hideAxis = false;
let nextFrame = false;
let pause = true;

function animate() {
    requestAnimationFrame(animate);

    graphics.update();

    if (!pause || nextFrame) {
        nextFrame = false;
        simulate(graphics);
    }
}

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
            cleanup(graphics);
            simulationSetup();
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
            cleanup(graphics);
            simulationSetup();
            break;

        case '_':
            pause = true;
            simulation = colisionTest;
            cleanup(graphics);
            simulationSetup();
            break;

        default:
            if (key >= '0' && key <= '9') {
                pause = true;
                switch (key - '0') {
                    default:
                    case 1:
                        simulation = simulationCross;
                        break;
                    case 5:
                        simulation = simulation0;
                        break;
                    case 2:
                        simulation = simulation1;
                        break;
                    case 3:
                        simulation = simulationGrid2D;
                        break;
                    case 4:
                        simulation = simulationGrid3D;
                        break;
                    case 6:
                        simulation = simulationSpheres;
                        break;
                    case 0:
                        simulation = simulationAtom;
                        break;
                }
                cleanup(graphics);
                simulationSetup();
            }
            break;

    }
})

function simulationSetup() {
    simulation(graphics);
    sceneSetup(graphics);
    graphics.cameraSetup();
}

window.onresize = function () {
    graphics.camera.aspect = window.innerWidth / window.innerHeight;
    graphics.camera.updateProjectionMatrix();
    graphics.renderer.setSize(window.innerWidth, window.innerHeight);
};

let simulation = simulationAtom;

if (WebGL.isWebGLAvailable()) {
    graphics.showAxis();
    simulationSetup();
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
}