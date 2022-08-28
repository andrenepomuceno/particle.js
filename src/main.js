import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import {
    Vector2,
} from 'three';
import * as dat from 'dat.gui';

import { Graphics } from './graphics.js'
import {
    simulationSetup,
    simulationStep,
    simulationState,
    simulationCsv,
    setColorMode,
    particleList,
} from './simulation.js';
import { Particle } from './physics.js';
import { fieldSetup, fieldProbe, drawField } from './field.js';

const graphics = new Graphics();
const gui = new dat.GUI();

let hideAxis = false;
let nextFrame = false;
let pause = false;
let simulationIdx = 0;
let colorMode = "charge";
let makeSnapshot = false;

let guiOptions = {
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
        },
        snapshot: function () {
            if (!makeSnapshot)
                makeSnapshot = true;
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
            (colorMode == "charge") ? (newMode = "random") : (newMode = "charge");
            colorMode = newMode;
            setColorMode(newMode);
        }
    },
    info: {
        name: "",
        particles: 0,
        energy: "",
        time: "",
        collisions: 0,
        mass: "",
        radius: "",
    },
    particle: {
        id: 0,
        mass: "",
        charge: "",
        nearCharge: "",
        position: "",
        velocityDir: "",
        velocityAbs: "",
        color: "",
        field: {
            direction: "",
            amplitude: "",
        },
        energy: "",
    }
}

const guiInfo = gui.addFolder("Information");
const guiParticle = gui.addFolder("Particle");
const guiSimulation = gui.addFolder("Simulation");
const guiView = gui.addFolder("View");
function guiSetup() {
    guiInfo.add(guiOptions.info, 'name').name('Name').listen();
    guiInfo.add(guiOptions.info, 'particles').name('Particles').listen();
    guiInfo.add(guiOptions.info, 'time').name('Time').listen();
    guiInfo.add(guiOptions.info, 'mass').name('Mass').listen();
    guiInfo.add(guiOptions.info, 'energy').name('Energy').listen();
    guiInfo.add(guiOptions.info, 'collisions').name('Collisions').listen();
    guiInfo.add(guiOptions.info, 'radius').name('Radius').listen();
    guiInfo.open();

    guiParticle.add(guiOptions.particle, 'id').name('ID').listen();
    guiParticle.add(guiOptions.particle, 'mass').name('Mass').listen();
    guiParticle.add(guiOptions.particle, 'charge').name('Charge').listen();
    guiParticle.add(guiOptions.particle, 'nearCharge').name('NearCharge').listen();
    guiParticle.add(guiOptions.particle, 'position').name('Position').listen();
    guiParticle.add(guiOptions.particle, 'velocityAbs').name('Velocity (abs)').listen();
    guiParticle.add(guiOptions.particle, 'velocityDir').name('Velocity (dir)').listen();
    guiParticle.add(guiOptions.particle, 'color').name('Color').listen();
    guiParticle.add(guiOptions.particle.field, 'amplitude').name('Field (abs)').listen();
    guiParticle.add(guiOptions.particle.field, 'direction').name('Field (dir)').listen();
    guiParticle.add(guiOptions.particle, 'energy').name('Energy').listen();
    //guiParticle.open();

    guiSimulation.add(guiOptions.simulation, 'pauseResume').name("Pause/Resume [SPACE]");
    guiSimulation.add(guiOptions.simulation, 'step').name("Step [N]");
    guiSimulation.add(guiOptions.simulation, 'reset').name("Reset [R]");
    guiSimulation.add(guiOptions.simulation, 'next').name("Next [>]");
    guiSimulation.add(guiOptions.simulation, 'previous').name("Previous [<]");
    guiSimulation.add(guiOptions.simulation, 'snapshot').name("Snapshot [P]");

    guiView.add(guiOptions.view, 'hideAxis').name("Hide/Show Axis [A]");
    guiView.add(guiOptions.view, 'resetCamera').name("Reset Camera [C]");
    guiView.add(guiOptions.view, 'xyCamera').name("XY Camera [V]");
    guiView.add(guiOptions.view, 'colorMode').name("Color Mode [Q]");

    //gui.close();
}

function download(data, filename, type) {
    let file = new Blob([data], { type: type });
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        let a = document.createElement("a"),
            url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

document.addEventListener("keydown", (event) => {
    let key = event.key;
    switch (key) {
        case ' ':
            guiOptions.simulation.pauseResume();
            break;

        case 'c':
            guiOptions.view.resetCamera();
            break;

        case 'r':
            guiOptions.simulation.reset();
            break;

        case 'p':
            guiOptions.simulation.snapshot();
            break;

        case 'P':
            particleList.forEach(v => {
                console.log(v.csv());
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

        case 'f':
            fieldSetup(graphics)
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

function updateInfo(now) {
    let [name, n, t, e, c, m, r] = simulationState();
    guiOptions.info.name = name;
    guiOptions.info.particles = n;
    let realTime = new Date(totalTime).toISOString().substring(11, 19);
    guiOptions.info.time = realTime + " (" + t + ")";
    guiOptions.info.energy = e;
    guiOptions.info.collisions = c;
    guiOptions.info.mass = m.toFixed(4);
    guiOptions.info.radius = r.toExponential(2);
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
        guiOptions.particle.velocityDir = arrayToString(
            particle.velocity.clone().normalize().toArray(), 2);
        guiOptions.particle.velocityAbs = particle.velocity.length().toFixed(6);
        let color = particle.sphere.material.color;
        guiOptions.particle.color = arrayToString(color.toArray(), 2);

        let probe = new Particle();
        probe.charge = 1;
        probe.mass = 1;
        probe.nearCharge = 1;
        probe.position = particle.position;
        let field = fieldProbe(probe);
        let amp = field.length();
        guiOptions.particle.field.amplitude = amp.toFixed(6);
        guiOptions.particle.field.direction = arrayToString(field.normalize().toArray(), 2);
        guiOptions.particle.energy = particle.energy().toFixed(6);

        guiParticle.open();
    }
}

function arrayToString(array, precision) {
    let str = "";
    array.forEach((v, idx) => {
        str += v.toFixed(precision) + ", ";
    });
    return str.slice(0, -2);
}

function snapshot() {
    let timestamp = new Date().toISOString();
    let name = simulationState()[0];
    download(simulationCsv(), name + "-" + timestamp + ".csv", "text/plain;charset=utf-8");
    graphics.renderer.domElement.toBlob((blob) => {
        download(blob, name + "-" + timestamp + ".png", "image/png");
    });
}

let lastUpdate = 0;
let lastTime = 0;
let totalTime = 0;
const updateDelay = 100;

function animate(time) {
    requestAnimationFrame(animate);

    graphics.update();

    if (makeSnapshot) {
        makeSnapshot = false;
        snapshot();
    }

    if (!pause || nextFrame) {
        nextFrame = false;
        simulationStep(graphics);

        if (!isNaN(time)) {
            let dt = time - lastTime;
            totalTime += dt;
        }
    }

    if (time - lastUpdate >= updateDelay) {
        lastUpdate = time;

        updateParticle();
        updateInfo(time);
    }

    if (!isNaN(time)) lastTime = time;
}

function skydome() {

}

if (WebGL.isWebGLAvailable()) {
    guiSetup();
    simulationSetup(graphics);
    skydome();
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
}