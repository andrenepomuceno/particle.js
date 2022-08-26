import * as dat from 'dat.gui';
import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import { Graphics } from './graphics.js'
import {
    simulationSetup, simulationStep, simulationState,
    particleList, toogleChargeColor, fieldProbe
} from './simulation.js';
import { Vector2, Vector3, ArrowHelper } from 'three';
import { Particle } from './physics.js';

const graphics = new Graphics();
let hideAxis = false;
let nextFrame = false;
let pause = false;
let simulationIdx = 0;

var options = {
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
            toogleChargeColor();
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
const gui = new dat.GUI();

const guiInfo = gui.addFolder("Information");
guiInfo.add(options.info, 'name').name('Name').listen();
guiInfo.add(options.info, 'particles').name('Particles').listen();
guiInfo.add(options.info, 'time').name('Time').listen();
guiInfo.add(options.info, 'energy').name('Energy').listen();
guiInfo.add(options.info, 'collisions').name('Collisions').listen();
guiInfo.open();

const guiParticle = gui.addFolder("Particle");
guiParticle.add(options.particle, 'id').name('ID').listen();
guiParticle.add(options.particle, 'mass').name('Mass').listen();
guiParticle.add(options.particle, 'charge').name('Charge').listen();
guiParticle.add(options.particle, 'nearCharge').name('NearCharge').listen();
guiParticle.add(options.particle, 'position').name('Position').listen();
guiParticle.add(options.particle, 'velocity').name('Velocity').listen();
guiParticle.add(options.particle, 'color').name('Color').listen();
guiParticle.add(options.particle.field, 'direction').name('Field Dir.').listen();
guiParticle.add(options.particle.field, 'amplitude').name('Field Amp.').listen();
guiParticle.open();

const guiSimulation = gui.addFolder("Simulation");
guiSimulation.add(options.simulation, 'pauseResume').name("Pause/Resume [SPACE]");
guiSimulation.add(options.simulation, 'step').name("Step [N]");
guiSimulation.add(options.simulation, 'reset').name("Reset [R]");
guiSimulation.add(options.simulation, 'next').name("Next [>]");
guiSimulation.add(options.simulation, 'previous').name("Previous [<]");

const guiView = gui.addFolder("View");
guiView.add(options.view, 'hideAxis').name("Hide/Show Axis [A]");
guiView.add(options.view, 'resetCamera').name("Reset Camera [C]");
guiView.add(options.view, 'xyCamera').name("XY Camera [V]");
guiView.add(options.view, 'colorMode').name("Color Mode [Q]");

//gui.close();

document.addEventListener("keydown", (event) => {
    let key = event.key;
    switch (key) {
        case ' ':
            options.info.example = !options.info.example;
            options.simulation.pauseResume();
            break;

        case 'c':
            options.view.resetCamera();
            break;

        case 'r':
            options.simulation.reset();
            break;

        case 'p':
            particleList.forEach((p, i) => {
                p.print();
            });
            break;

        case 'a':
            options.view.hideAxis();
            break;

        case 'v':
            options.view.xyCamera();
            break;

        case 'n':
            options.simulation.step();
            break;

        case 'q':
            options.view.colorMode();
            break;

        case '>':
            options.simulation.next();
            break;

        case '<':
            options.simulation.previous();
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
    options.info.name = name;
    options.info.particles = n;
    options.info.time = t;
    options.info.energy = e;
    options.info.collisions = c;
}

function updateParticle() {
    //if (!pause) return;
    let particle = graphics.raycast(pointer);
    if (particle) {
        options.particle.id = particle.id;
        options.particle.mass = particle.mass;
        options.particle.charge = particle.charge;
        options.particle.nearCharge = particle.nearCharge;
        options.particle.position = arrayToString(particle.position.toArray(), 2);
        options.particle.velocity = arrayToString(particle.velocity.toArray(), 2);
        let color = particle.sphere.material.color;
        options.particle.color = arrayToString(color.toArray());

        let probe = new Particle();
        probe.charge = 1;
        probe.mass = 1;
        probe.nearCharge = 1;
        probe.position = particle.position;
        let field = fieldProbe(probe);
        let amp = field.length();
        options.particle.field.amplitude = amp.toFixed(4);
        options.particle.field.direction = arrayToString(field.normalize().toArray(), 2);
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
    simulationSetup(graphics);
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
}