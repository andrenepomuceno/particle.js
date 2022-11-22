import {
    Vector2, Vector3,
} from 'three';
import * as dat from 'dat.gui';
import { Particle } from './physics.js';
import { downloadFile, arrayToString, cameraToWorld } from './helpers.js';
import {
    simulationSetup,
    simulationExportCsv,
    setColorMode,
    graphics,
    useGPU,
    simulationImportCSV,
    simulation,
    simulationUpdatePhysics,
    simulationUpdateParticle,
    simulationFindParticle,
    simulationUpdateAll,
} from './simulation.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

let stats = new Stats();
document.getElementById("container").appendChild(stats.dom);

export const gui = new dat.GUI();
const guiInfo = gui.addFolder("Information");
const guiParticle = gui.addFolder("Particle");
const guiSimulation = gui.addFolder("Simulation");
const guiView = gui.addFolder("View");
const guiParameters = gui.addFolder("Parameters");

let hideAxis = false;
let nextFrame = false;
let pause = false;
let simulationIdx = 0;
let colorMode = "charge";
let followParticle = false;
let mousePosition = new Vector2(1e5, 1e5);
let mouseOverGUI = false;
const viewUpdateDelay = 1000;
let makeSnapshot = false;

function setup(idx) {
    resetParticleView();
    simulationSetup(idx);
    resetEditView();
    updateInfoView();
}

export let guiOptions = {
    simulation: {
        pauseResume: function () {
            pause = !pause;
        },
        step: function () {
            nextFrame = true;
        },
        reset: function () {
            setup();
        },
        next: function () {
            setup(++simulationIdx);
        },
        previous: function () {
            if (simulationIdx > 0)
                setup(--simulationIdx);
        },
        snapshot: function () {
            if (!makeSnapshot) makeSnapshot = true
        },
        import: function () {
            let input = document.createElement('input');
            input.type = 'file';
            input.accept = ".csv";
            input.onchange = e => {
                let file = e.target.files[0];
                let reader = new FileReader();
                reader.readAsText(file, 'UTF-8');
                reader.onload = readerEvent => {
                    let content = readerEvent.target.result;

                    resetParticleView();
                    simulationImportCSV(file.name, content);
                    resetEditView();
                    updateInfoView();
                }
            }
            input.click();
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
        cameraDistance: "",
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

            graphics.camera.position.set(x.x, x.y, graphics.controls.getDistance());
            graphics.controls.target.set(x.x, x.y, x.z);
            graphics.controls.update();

            //graphics.controls.target.set(x.x, x.y, x.z);
        },
        close: function () {
            resetParticleView();
        },
        reset: () => {
            simulationUpdateParticle(guiOptions.particle.obj, "reset", 0);
        }
    },
    parameters: {
        massConstant: "",
        chargeConstant: "",
        nearChargeConstant: "",
        nearChargeRange: "",
        boundaryDamping: "",
        boundaryDistance: "",
        minDistance: "",
        forceConstant: "",
        maxParticles: "",
        radius: "",
        radiusRange: "",
        close: () => {
            guiParameters.close();
        },
    }
}

export function guiSetup() {
    //gui.width = 300;

    function mouseOver() {
        mouseOverGUI = true;
    }
    function mouseLeave() {
        mouseOverGUI = false;
    }

    gui.domElement.addEventListener("mouseover", mouseOver);
    gui.domElement.addEventListener("mouseleave", mouseLeave);
    stats.domElement.addEventListener("mouseover", mouseOver);
    stats.domElement.addEventListener("mouseleave", mouseLeave);

    guiInfo.add(guiOptions.info, 'name').name('Name').listen().onFinishChange((val) => {
        simulation.name = val;
    });
    guiInfo.add(guiOptions.info, 'particles').name('Particles').listen();
    guiInfo.add(guiOptions.info, 'time').name('Time').listen();
    guiInfo.add(guiOptions.info, 'mass').name('Mass').listen().onFinishChange((val) => {
        simulationUpdateAll("mass", val);
    });
    guiInfo.add(guiOptions.info, 'charge').name('Charge').listen().onFinishChange((val) => {
        simulationUpdateAll("charge", val);
    });;
    guiInfo.add(guiOptions.info, 'energy').name('Energy').listen();
    guiInfo.add(guiOptions.info, 'collisions').name('Collisions').listen();
    //guiInfo.add(guiOptions.info, 'radius').name('Radius').listen();
    guiInfo.add(guiOptions.info, 'cameraDistance').name('Camera Distance').listen();
    guiInfo.open();

    guiParticle.add(guiOptions.particle, 'id').name('ID').listen().onFinishChange((val) => {
        let obj = simulationFindParticle(parseInt(val));
        if (obj) {
            guiOptions.particle.obj = obj;
        }
    });
    guiParticle.add(guiOptions.particle, 'mass').name('Mass').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "mass", val);
    });
    guiParticle.add(guiOptions.particle, 'charge').name('Charge').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "charge", val);
    });
    guiParticle.add(guiOptions.particle, 'nearCharge').name('NearCharge').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "nearCharge", val);
    });
    guiParticle.add(guiOptions.particle, 'position').name('Position').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "position", val);
    });
    guiParticle.add(guiOptions.particle, 'velocityAbs').name('Velocity').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "velocityAbs", val);
    });
    guiParticle.add(guiOptions.particle, 'velocityDir').name('Direction').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "velocityDir", val);
    });
    guiParticle.add(guiOptions.particle, 'color').name('Color').listen();
    guiParticle.add(guiOptions.particle.field, 'amplitude').name('Field Force').listen();
    guiParticle.add(guiOptions.particle.field, 'direction').name('Field Dir.').listen();
    guiParticle.add(guiOptions.particle, 'energy').name('Energy').listen();
    guiParticle.add(guiOptions.particle, 'follow').name('Follow/Unfollow');
    guiParticle.add(guiOptions.particle, 'lookAt').name('Look At');
    guiParticle.add(guiOptions.particle, 'reset').name('Reset');
    guiParticle.add(guiOptions.particle, 'close').name('Close');
    //guiParticle.open();

    guiSimulation.add(guiOptions.simulation, 'pauseResume').name("Pause/Resume [SPACE]");
    guiSimulation.add(guiOptions.simulation, 'step').name("Step [N]");
    guiSimulation.add(guiOptions.simulation, 'reset').name("Reset [R]");
    guiSimulation.add(guiOptions.simulation, 'next').name("Next [>]");
    guiSimulation.add(guiOptions.simulation, 'previous').name("Previous [<]");
    guiSimulation.add(guiOptions.simulation, 'snapshot').name("Export [P]");
    guiSimulation.add(guiOptions.simulation, 'import').name("Import");

    guiView.add(guiOptions.view, 'hideAxis').name("Hide/Show Axis [A]");
    guiView.add(guiOptions.view, 'resetCamera').name("Reset Camera [C]");
    guiView.add(guiOptions.view, 'xyCamera').name("XY Camera [V]");
    guiView.add(guiOptions.view, 'colorMode').name("Color Mode [Q]");

    guiParameters.add(guiOptions.parameters, 'massConstant').name("massConstant").listen().onFinishChange((val) => {
        simulationUpdatePhysics("massConstant", val);
    });
    guiParameters.add(guiOptions.parameters, 'chargeConstant').name("chargeConstant").listen().onFinishChange((val) => {
        simulationUpdatePhysics("chargeConstant", val);
    });
    guiParameters.add(guiOptions.parameters, 'nearChargeConstant').name("nearChargeConstant").listen().onFinishChange((val) => {
        simulationUpdatePhysics("nearChargeConstant", val);
    });
    guiParameters.add(guiOptions.parameters, 'nearChargeRange').name("nearChargeRange").listen().onFinishChange((val) => {
        simulationUpdatePhysics("nearChargeRange", val);
    });
    guiParameters.add(guiOptions.parameters, 'boundaryDamping').name("boundaryDamping").listen().onFinishChange((val) => {
        simulationUpdatePhysics("boundaryDamping", val);
    });
    guiParameters.add(guiOptions.parameters, 'boundaryDistance').name("boundaryDistance").listen().onFinishChange((val) => {
        simulationUpdatePhysics("boundaryDistance", val);
    });
    guiParameters.add(guiOptions.parameters, 'minDistance').name("minDistance").listen().onFinishChange((val) => {
        simulationUpdatePhysics("minDistance", val);
    });
    guiParameters.add(guiOptions.parameters, 'forceConstant').name("forceConstant").listen().onFinishChange((val) => {
        simulationUpdatePhysics("forceConstant", val);
    });
    guiParameters.add(guiOptions.parameters, 'radius').name("radius").listen().onFinishChange((val) => {
        simulationUpdatePhysics("radius", val);
    });
    guiParameters.add(guiOptions.parameters, 'radiusRange').name("radiusRange").listen().onFinishChange((val) => {
        simulationUpdatePhysics("radiusRange", val);
    });
    guiParameters.add(guiOptions.parameters, 'maxParticles').name("maxParticles").listen().onFinishChange((val) => {
        val = parseFloat(val);
        if (val != simulation.physics.particleList.length) {
            graphics.setMaxParticles(val);
            setup();
        }
    });
    guiParameters.add(guiOptions.parameters, 'close').name("Close");

    //gui.close();
}

window.onresize = () => {
    graphics.onWindowResize(window);
};

window.addEventListener('pointermove', function (event) {
    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components
    mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePosition.y = - (event.clientY / window.innerHeight) * 2 + 1;
});

document.addEventListener("keydown", (event) => {
    if (mouseOverGUI) return;

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
            console.log(simulationExportCsv());
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
            simulation.fieldSetup("update");
            break;

        case 'h':
            let visibility = stats.dom.style.visibility;
            if (visibility != "hidden")
                stats.dom.style.visibility = "hidden";
            else
                stats.dom.style.visibility = "visible";
            break;

        default:
            break;

    }
});

let selectionStarted = false;
let selectionP0 = undefined;
let selectionP1 = undefined;

function startSelection() {
    selectionStarted = true;
    graphics.controls.enabled = false;
    selectionP0 = cameraToWorld(mousePosition, graphics.camera, 0);
}

function endSelection() {
    selectionStarted = false;
    selectionP1 = cameraToWorld(mousePosition, graphics.camera, 0);
    graphics.controls.enabled = true;

    graphics.readbackParticleData();

    let top = selectionP0;
    let botton = selectionP1;

    let particles = 0;
    let totalMass = 0;
    let totalCharge = 0;
    let totalVelocity = new Vector3();

    graphics.particleList.forEach(p => {
        let pos = p.position;
        if (
            pos.x >= top.x && 
            pos.x <= botton.x && 
            pos.y >= botton.y && 
            pos.y <= top.y
        ) {
            particles++;
            totalMass += p.mass;
            totalCharge += p.charge;
            totalVelocity.add(p.velocity);
        }
    })

    console.log(particles);
    console.log(totalMass);
    console.log(totalCharge);
    console.log(totalVelocity.length()/particles);
    console.log(totalVelocity.normalize().toArray());
}

document.addEventListener("mousedown", (event) => {
    if (event.button == 0 && event.shiftKey) {
        startSelection();
    }
});

document.addEventListener("mouseup", (event) => {
    if (event.button == 0 && selectionStarted) {
        endSelection();
    } else if (event.button == 0 && !mouseOverGUI) {
        let particle = graphics.raycast(mousePosition);
        if (particle) {
            guiOptions.particle.obj = particle;
            guiParticle.open();
        }
    }
});

function updateInfoView(now) {
    let [name, n, t, e, c, m, r, totalTime, totalCharge] = simulation.state();
    guiOptions.info.name = name;
    guiOptions.info.particles = n;
    let realTime = new Date(totalTime).toISOString().substring(11, 19);
    guiOptions.info.time = realTime + " (" + t + ")";
    guiOptions.info.energy = (e / n).toExponential(2) + " / " + Math.sqrt(e / m).toExponential(2);
    guiOptions.info.collisions = c;
    guiOptions.info.mass = m.toExponential(2);
    guiOptions.info.radius = r.toExponential(2);
    guiOptions.info.charge = totalCharge.toExponential(2);
    guiOptions.info.cameraDistance = graphics.controls.getDistance().toExponential(2);
}

function updateParticleView() {
    let particleView = guiOptions.particle;
    let particle = particleView.obj;

    if (particle) {
        if (useGPU) graphics.readbackParticleData(particle);

        //static info
        particleView.id = particle.id;
        particleView.mass = particle.mass.toExponential(3);
        particleView.charge = particle.charge.toExponential(3);
        particleView.nearCharge = particle.nearCharge;

        let color = particle.color;
        if (particle.mesh) {
            color = particle.mesh.material.color;
        }
        particleView.color = arrayToString(color.toArray(), 2);

        //dynamic info
        let position = [];
        particle.position.toArray().forEach(element => {
            position.push(element.toExponential(3));
        });
        particleView.position = position;
        particleView.velocityDir = arrayToString(
            particle.velocity.clone().normalize().toArray(), 2);
        particleView.velocityAbs = particle.velocity.length().toExponential(3);

        // field info
        let probe = new Particle();
        probe.charge = 1;
        probe.mass = 1;
        probe.nearCharge = 1;
        probe.position = particle.position;
        let field = simulation.fieldProbe(probe);
        let fieldAmp = field.length();
        particleView.field.amplitude = fieldAmp.toExponential(3);
        particleView.field.direction = arrayToString(field.normalize().toArray(), 2);
        particleView.energy = particle.energy().toExponential(3);
    }
}

function resetParticleView(clear = true) {
    followParticle = false;
    if (clear) {
        let particleView = guiOptions.particle;
        particleView.obj = undefined;
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
        guiParticle.close();
    }
}

function resetEditView() {
    let edit = guiOptions.parameters;
    edit.massConstant = simulation.physics.massConstant.toExponential(2);
    edit.chargeConstant = simulation.physics.chargeConstant.toExponential(2);
    edit.nearChargeConstant = simulation.physics.nearChargeConstant.toExponential(2);
    edit.nearChargeRange = simulation.physics.nearChargeRange.toExponential(2);
    edit.boundaryDamping = simulation.physics.boundaryDamping;
    edit.boundaryDistance = simulation.physics.boundaryDistance.toExponential(2);
    edit.minDistance = simulation.physics.minDistance;
    edit.forceConstant = simulation.physics.forceConstant;
    edit.radius = simulation.particleRadius;
    edit.radiusRange = simulation.particleRadiusRange;
    edit.maxParticles = graphics.maxParticles;
}

function snapshot() {
    let timestamp = new Date().toISOString();
    let name = simulation.state()[0];
    let finalName = name + "_" + timestamp;
    finalName = finalName.replaceAll(/[ :\/-]/ig, "_").replaceAll(/\.csv/ig, "");
    console.log("snapshot " + finalName);
    downloadFile(simulationExportCsv(), finalName + ".csv", "text/plain;charset=utf-8");
    graphics.renderer.domElement.toBlob((blob) => {
        downloadFile(blob, finalName + ".png", "image/png");
    });
}

let lastViewUpdate = 0;
let lastAnimateTime = 0;
let updateField = false;

export function animate(time) {
    requestAnimationFrame(animate);

    graphics.update();
    stats.update();

    if (makeSnapshot) {
        makeSnapshot = false;
        snapshot();
    }

    if (followParticle && guiOptions.particle.obj) {
        let x = guiOptions.particle.obj.position;

        graphics.camera.position.set(x.x, x.y, graphics.controls.getDistance());
        graphics.controls.target.set(x.x, x.y, x.z);
        graphics.controls.update();
    }

    if (!pause || nextFrame) {
        nextFrame = false;

        let dt = 0;
        if (!isNaN(time) && lastAnimateTime > 0) {
            dt = time - lastAnimateTime;
        }

        simulation.step(dt);
    }

    if (time - lastViewUpdate >= viewUpdateDelay) {
        lastViewUpdate = time;

        updateParticleView();
        updateInfoView(time);

        if (updateField) {
            updateField = false;
            simulation.fieldSetup("update");
        }
    }

    if (!isNaN(time)) lastAnimateTime = time;
}