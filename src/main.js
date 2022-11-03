import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import {
    Vector2,
} from 'three';
import * as dat from 'dat.gui';

import {
    simulationSetup,
    simulationStep,
    simulationState,
    simulationCsv,
    setColorMode,
    particleList,
    graphics
} from './simulationAPI.js';
import { Particle } from './physics.js';
import { fieldProbe, fieldSetup } from './field.js';
import { downloadFile, arrayToString } from './helpers.js';

const gui = new dat.GUI();

let hideAxis = false;
let nextFrame = false;
let pause = false;
let simulationIdx = 0;
let colorMode = "charge";
let makeSnapshot = false;
let followParticle = false;

let guiOptions = {
    simulation: {
        pauseResume: function () {
            pause = !pause;
        },
        step: function () {
            nextFrame = true;
        },
        reset: function () {
            resetParticleView();
            simulationSetup(graphics);
        },
        next: function () {
            resetParticleView();
            simulationSetup(graphics, ++simulationIdx);
        },
        previous: function () {
            if (simulationIdx == 0) return;
            resetParticleView();
            simulationSetup(graphics, --simulationIdx);
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
            resetParticleView(false);
            graphics.controls.reset();
        },
        xyCamera: function () {
            resetParticleView(false);
            graphics.camera.position.set(0, 0, graphics.cameraDistance);
            graphics.controls.target.set(0, 0, 0);
            graphics.controls.update();
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
        charge: "",
    },
    particle: {
        obj: undefined,
        id: "",
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
        follow: function () {
            followParticle = !followParticle;
        },
        lookAt: function () {
            let x = guiOptions.particle.obj.position;
            graphics.controls.target.set(x.x, x.y, x.z);
        }
    }
}

function resetParticleView(clear = true) {
    followParticle = false;
    if (clear) {
        let particleView = guiOptions.particle;
        particleView.obj = "";
        particleView.id = "";
        particleView.mass = "";
        particleView.charge = "";
        particleView.nearCharge = "";
        particleView.color = "";
        particleView.position = "";
        particleView.velocityDir = "";
        particleView.velocityAbs = "";
        particleView.field.amplitude = "";
        particleView.field.direction = "";
        particleView.energy = "";
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
    guiInfo.add(guiOptions.info, 'charge').name('Charge').listen();
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
    guiParticle.add(guiOptions.particle, 'follow').name('Follow/Unfollow');
    guiParticle.add(guiOptions.particle, 'lookAt').name('Look At');
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
            fieldSetup(graphics, "update");
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

document.addEventListener("click", (e) => {
    let particle = graphics.raycast(mousePosition);
    if (particle) {
        guiOptions.particle.obj = particle;
        guiParticle.open();
    }
});

graphics.controls.addEventListener("end", e => {
    //updateField = true;
});

window.onresize = function () {
    graphics.onWindowResize(window);
};

let mousePosition = new Vector2(1e5, 1e5);
window.addEventListener('pointermove', function (event) {
    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components
    mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = - (event.clientY / window.innerHeight) * 2 + 1;
});

function updateInfo(now) {
    let [name, n, t, e, c, m, r, totalTime, totalCharge] = simulationState();
    guiOptions.info.name = name;
    guiOptions.info.particles = n;
    let realTime = new Date(totalTime).toISOString().substring(11, 19);
    guiOptions.info.time = realTime + " (" + t + ")";
    guiOptions.info.energy = e.toExponential(3);
    guiOptions.info.collisions = c;
    guiOptions.info.mass = m.toExponential(3);
    guiOptions.info.radius = r.toExponential(3);
    guiOptions.info.charge = totalCharge.toExponential(3);
}

function updateParticle() {
    let particleView = guiOptions.particle;
    let particle = particleView.obj;
    if (particle) {
        //static info
        particleView.id = particle.id;
        particleView.mass = particle.mass.toExponential(3);
        particleView.charge = particle.charge.toExponential(3);
        particleView.nearCharge = particle.nearCharge;
        let color = particle.mesh.material.color;
        particleView.color = arrayToString(color.toArray(), 2);

        //dynamic info
        particleView.position = arrayToString(particle.position.toArray(), 2);
        particleView.velocityDir = arrayToString(
            particle.velocity.clone().normalize().toArray(), 2);
        particleView.velocityAbs = particle.velocity.length().toExponential(3);

        // field info
        let probe = new Particle();
        probe.charge = 1;
        probe.mass = 1;
        probe.nearCharge = 1;
        probe.position = particle.position;
        let field = fieldProbe(probe);
        let fieldAmp = field.length();
        particleView.field.amplitude = fieldAmp.toExponential(3);
        particleView.field.direction = arrayToString(field.normalize().toArray(), 2);
        particleView.energy = particle.energy().toExponential(3);
    }
}

function snapshot() {
    let timestamp = new Date().toISOString();
    let name = simulationState()[0];
    downloadFile(simulationCsv(), name + "-" + timestamp + ".csv", "text/plain;charset=utf-8");
    graphics.renderer.domElement.toBlob((blob) => {
        downloadFile(blob, name + "-" + timestamp + ".png", "image/png");
    });
}

let lastUpdate = 0;
let lastTime = 0;
const updateDelay = 100;
let updateField = false;

function animate(time) {
    requestAnimationFrame(animate);

    graphics.update();

    if (makeSnapshot) {
        makeSnapshot = false;
        snapshot();
    }

    if (followParticle && guiOptions.particle.obj) {
        let x = guiOptions.particle.obj.position;
        graphics.controls.target.set(x.x, x.y, x.z);
    }

    if (!pause || nextFrame) {
        nextFrame = false;

        let dt = 0;
        if (!isNaN(time) && lastTime > 0) {
            dt = time - lastTime;
        }

        simulationStep(dt);
    }

    if (time - lastUpdate >= updateDelay) {
        lastUpdate = time;

        updateParticle();
        updateInfo(time);

        if (updateField) {
            updateField = false;
            fieldSetup(graphics, "update");
        }
    }

    if (!isNaN(time)) lastTime = time;
}

if (WebGL.isWebGLAvailable()) {
    guiSetup();
    simulationSetup(graphics);
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container').appendChild(warning);
}