import * as dat from 'dat.gui';
import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import { Graphics } from './graphics.js'
import {
    simulationSetup, simulationStep, simulationState,
    particleList, setColorMode
} from './simulation.js';
import { Vector2 } from 'three';
import { Particle } from './physics.js';
import { fieldProbe } from './field.js';

const graphics = new Graphics();
let hideAxis = false;
let nextFrame = false;
let pause = false;
let simulationIdx = 0;
let colorMode = "charge";
const gui = new dat.GUI();
var guiOptions = {
    simulation: {
        pauseResume: function () {
            pause = !pause;
        },
        step: function () {
            nextFrame = true;
        },
        reset: function () {
            simulationSetup(graphics);
        },
        next: function () {
            ++simulationIdx;
            simulationSetup(graphics, simulationIdx);
        },
        previous: function () {
            if (simulationIdx == 0) return;
            --simulationIdx;
            simulationSetup(graphics, simulationIdx);
        }
    },
    view: {
        hideAxis: function () {
            hideAxis = !hideAxis;
            graphics.showAxis(!hideAxis);
        },
        resetCamera: function () {
            graphics.controls.reset();
        },
        xyCamera: function () {
            graphics.camera.position.set(0, 0, graphics.cameraDistance);
            graphics.controls.update();
            graphics.controls.target.set(0, 0, 0);
        },
        colorMode: function () {
            let newMode;
            (colorMode == "charge")?(newMode = "random"):(newMode = "charge");
            colorMode = newMode;
            setColorMode(newMode);
            simulationSetup(graphics);
        }
    },
    info: {
        name: "",
        particles: 0,
        energy: "",
        time: 0,
        collisions: 0,
    },
    particle: {
        id: 0,
        mass: 0,
        charge: 0,
        nearCharge: 0,
        position: "",
        velocity: "",
        color: "",
        field: {
            direction: "",
            amplitude: "",
        }
    }
}

function guiSetup() {
    const guiInfo = gui.addFolder("Information");
    guiInfo.add(guiOptions.info, 'name').name('Name').listen();
    guiInfo.add(guiOptions.info, 'particles').name('Particles').listen();
    guiInfo.add(guiOptions.info, 'time').name('Time').listen();
    guiInfo.add(guiOptions.info, 'energy').name('Energy').listen();
    guiInfo.add(guiOptions.info, 'collisions').name('Collisions').listen();
    guiInfo.open();

    const guiParticle = gui.addFolder("Particle");
    guiParticle.add(guiOptions.particle, 'id').name('ID').listen();
    guiParticle.add(guiOptions.particle, 'mass').name('Mass').listen();
    guiParticle.add(guiOptions.particle, 'charge').name('Charge').listen();
    guiParticle.add(guiOptions.particle, 'nearCharge').name('NearCharge').listen();
    guiParticle.add(guiOptions.particle, 'position').name('Position').listen();
    guiParticle.add(guiOptions.particle, 'velocity').name('Velocity').listen();
    guiParticle.add(guiOptions.particle, 'color').name('Color').listen();
    guiParticle.add(guiOptions.particle.field, 'direction').name('Field Dir.').listen();
    guiParticle.add(guiOptions.particle.field, 'amplitude').name('Field Amp.').listen();
    guiParticle.open();

    const guiSimulation = gui.addFolder("Simulation");
    guiSimulation.add(guiOptions.simulation, 'pauseResume').name("Pause/Resume [SPACE]");
    guiSimulation.add(guiOptions.simulation, 'step').name("Step [N]");
    guiSimulation.add(guiOptions.simulation, 'reset').name("Reset [R]");
    guiSimulation.add(guiOptions.simulation, 'next').name("Next [>]");
    guiSimulation.add(guiOptions.simulation, 'previous').name("Previous [<]");

    const guiView = gui.addFolder("View");
    guiView.add(guiOptions.view, 'hideAxis').name("Hide/Show Axis [A]");
    guiView.add(guiOptions.view, 'resetCamera').name("Reset Camera [C]");
    guiView.add(guiOptions.view, 'xyCamera').name("XY Camera [V]");
    guiView.add(guiOptions.view, 'colorMode').name("Color Mode [Q]");

    //gui.close();
}

document.addEventListener("keydown", (event) => {
    let key = event.key;
    switch (key) {
        case ' ':
            guiOptions.info.example = !guiOptions.info.example;
            guiOptions.simulation.pauseResume();
            break;

        case 'c':
            guiOptions.view.resetCamera();
            break;

        case 'r':
            guiOptions.simulation.reset();
            break;

        case 'p':
            particleList.forEach((p, i) => {
                p.print();
            });
            break;

        case 'a':
            guiOptions.view.hideAxis();
            break;

        case 'v':
            guiOptions.view.xyCamera();
            break;

        case 'n':
            guiOptions.simulation.step();
            break;

        case 'q':
            guiOptions.view.colorMode();
            break;

        case '>':
            guiOptions.simulation.next();
            break;

        case '<':
            guiOptions.simulation.previous();
            break;

        default:
            if (key >= '0' && key <= '9') {
                pause = true;
                simulationIdx = key - '0' - 1;
                simulationSetup(graphics, simulationIdx);
            }
            break;

    }
});

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

function updateInfo() {
    let [name, n, t, e, c] = simulationState();
    guiOptions.info.name = name;
    guiOptions.info.particles = n;
    guiOptions.info.time = t;
    guiOptions.info.energy = e;
    guiOptions.info.collisions = c;
}

function updateParticle() {
    //if (!pause) return;
    let particle = graphics.raycast(pointer);
    if (particle) {
        guiOptions.particle.id = particle.id;
        guiOptions.particle.mass = particle.mass;
        guiOptions.particle.charge = particle.charge;
        guiOptions.particle.nearCharge = particle.nearCharge;
        guiOptions.particle.position = arrayToString(particle.position.toArray(), 2);
        guiOptions.particle.velocity = arrayToString(particle.velocity.toArray(), 2);
        let color = particle.sphere.material.color;
        guiOptions.particle.color = arrayToString(color.toArray());

        let probe = new Particle();
        probe.charge = 1;
        probe.mass = 1;
        probe.nearCharge = 1;
        probe.position = particle.position;
        let field = fieldProbe(probe);
        let amp = field.length();
        guiOptions.particle.field.amplitude = amp.toFixed(4);
        guiOptions.particle.field.direction = arrayToString(field.normalize().toArray(), 2);
    }
}

function arrayToString(array, precision) {
    let str = "";
    array.forEach((v, idx) => {
        str += v.toFixed(precision) + ", ";
    });
    return str.slice(0, -2);
}

let last = 0;
let totalTime = 0;
const updateDelay = 250;
function animate(now) {
    requestAnimationFrame(animate);

    graphics.update();

    if (!pause || nextFrame) {
        nextFrame = false;
        simulationStep(graphics);
    }

    if (now - last >= updateDelay) {
        last = now;

        updateParticle();
        updateInfo(now);
    }
}

if (WebGL.isWebGLAvailable()) {
    guiSetup();
    simulationSetup(graphics);
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
}