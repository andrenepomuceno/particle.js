import { Vector3 } from 'three';
import * as dat from 'dat.gui';
import Stats from 'three/examples/jsm/libs/stats.module.js';

import { NuclearPotentialType } from './physics.js';
import { ParticleType } from './particle.js';
import {
    downloadFile, arrayToString, cameraToWorldCoord,
    decodeVector3, random, floatArrayToString,
    generateHexagon, exportFilename
} from './helpers.js';
import {
    graphics,
    simulation,
    simulationSetup,
    simulationExportCsv,
    simulationImportCSV,
    simulationUpdatePhysics,
    simulationFindParticle,
    simulationUpdateParticle,
    simulationCreateParticleList,
    simulationUpdateParticleList,
    simulationImportParticleList,
    simulationDeleteParticleList,
    simulationParticleAutoCleanup,
} from './core.js';
import { scenariosList } from './scenarios.js';
import { SelectionHelper, SourceType } from './selectionHelper.js';
import { createParticle, randomVector } from './scenarios/helpers.js';
import { MouseHelper } from './mouseHelper';
import { Keyboard } from './keyboard.js';
import { randomSphericVector } from './helpers.js';

let hideAxis = false;
let simulationIdx = 0;
let colorMode = "charge";
let hideOverlay = false;
let nextFrame = false;
let pause = false;
let followParticle = false;
const viewUpdateDelay = 1000;
let lastViewUpdate = 0;
let lastAnimateTime = 0;
let autoRefresh = true;

let statsPanel = new Stats();
let energyPanel = statsPanel.addPanel(new Stats.Panel('V', '#ff8', '#221'));

const gui = new dat.GUI();
const guiInfo = gui.addFolder("INFORMATION");
const guiControls = gui.addFolder("CONTROLS (keyboard and mouse shortcuts)");
const guiParticle = gui.addFolder("PARTICLE INFO (click on particle or enter ID)");
const guiSelection = gui.addFolder("PARTICLE SELECTION");
const guiGenerate = gui.addFolder("SELECTION GENERATOR");
const guiParameters = gui.addFolder("SIMULATION PARAMETERS");
const guiAdvancedControls = gui.addFolder("ADVANCED CONTROLS");
const guiField = gui.addFolder("FIELD CONTROLS");

function log(msg) {
    console.log("View: " + msg);
}

let collapseList = [];
let guiOptions = {
    info: {
        name: "",
        particles: "",
        energy: "",
        time: "",
        collisions: 0,
        mass: "",
        radius: "",
        charge: "",
        cameraDistance: "",
        cameraPosition: "",
        autoRefresh: autoRefresh,
        mode2D: false,
        folderName: "",
        velocity: "",
    },
    controls: {
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
            if (simulationIdx < scenariosList.length - 1)
                setup(++simulationIdx);
        },
        previous: function () {
            if (simulationIdx > 0)
                setup(--simulationIdx);
        },
        snapshot: function () {
            snapshot();
        },
        import: function () {
            uploadCsv((name, content) => {
                guiParticleClose();
                simulationImportCSV(name, content);
                guiInfoRefresh();
                guiParametersRefresh();
            });
        },
        hideAxis: function () {
            hideAxis = !hideAxis;
            graphics.showAxis(!hideAxis);
        },
        resetCamera: function () {
            followParticle = false;
            graphics.controls.reset();
        },
        xyCamera: function () {
            followParticle = false;
            cameraTargetSet(new Vector3());
        },
        colorMode: function () {
            (colorMode == "charge") ? (colorMode = "random") : (colorMode = "charge");
            simulation.setColorMode(colorMode);
        },
        placeHint: function () {
            alert(
                'Press "Z" to place a particle selection on the mouse/pointer position.\n' +
                'You can get particle selections from various sources:\n' +
                '- Select particles with SHIFT + CLICK + DRAG, then press "Z" to move the particles!\n' +
                '- If you want to make clones, press "X" or the "Clone" button on the selection folder.\n' +
                '- If you want to generate new particles, use the "SELECTION GENERATOR" menu. (or press "G" then "Z")\n'
            );
        },
        wip: function () {
            alert("Work in progress!");
        },
        home: function () {
            simulationIdx = 0;
            setup(simulationIdx);
        },
        mouseHint: () => {
            alert(
                "LEFT BUTTON: select particle/camera rotation (3D mode only)\n" +
                "MIDDLE BUTTON/SCROLL: zoom in/out.\n" +
                "RIGHT BUTTON: move camera position (pan).\n" +
                "SHIFT+LEFT CLICK/DRAG: select a group of particles.\n" +
                "HINT: Keyboard commands do not work when mouse pointer is over the menus!"
            );
        },
        deleteAll: () => {
            if (confirm("This will delete all particles.\nAre you sure?")) {
                simulationDeleteAll();
            }
        },
        sandbox: () => {
            setup(-1);
        },
        hideOverlay: () => {
            if (hideOverlay == false) {
                statsPanel.domElement.style.visibility = "hidden";
                gui.hide();
                hideOverlay = true;
            } else {
                statsPanel.domElement.style.visibility = "visible";
                gui.show();
                hideOverlay = false;
            }
        },
        close: () => {
            guiControls.close();
        },
        collapseAll: () => {
            collapseList.forEach((obj) => {
                obj.close();
            });
        },
        place: () => {
            selectionPlace();
        },
        showCursor: true,
    },
    particle: {
        obj: undefined,
        id: "",
        mass: "",
        charge: "",
        nuclearCharge: "",
        position: "",
        velocityDir: "",
        velocityAbs: "",
        color: "#000000",
        fixed: false,
        energy: "",
        follow: function () {
            followParticle = !followParticle;
        },
        lookAt: function () {
            let x = guiOptions.particle.obj.position;
            cameraTargetSet(x);
            //graphics.controls.target.set(x.x, x.y, x.z);
        },
        close: function () {
            guiParticleClose();
        },
        reset: () => {
            simulationUpdateParticle(guiOptions.particle.obj, "reset", 0);
        },
        delete: () => {

        },
    },
    selection: {
        source: "None",
        particles: 0,
        mass: "",
        charge: "",
        nuclearCharge: "",
        velocity: "",
        velocityDir: "",
        center: "",
        fixedPosition: false,
        export: () => {
            selection.export();
        },
        import: () => {
            uploadCsv((name, content) => {
                selection = new SelectionHelper(graphics, guiOptions.selection, guiSelection);
                simulationImportParticleList(selection, name, content);
            });
        },
        clone: () => {
            selection.clone();
            selection.guiRefresh();
        },
        clear: () => {
            guiSelectionClose();
        },
        delete: () => {
            if (selection.list == undefined || selection.list.length == 0) return;
            if (selection.source != SourceType.simulation) {
                alert('Selection source must be "simulation".\nSelect particles first.');
                return;
            }
            simulationDeleteParticleList(selection.list);
            guiSelectionClose();
        },
        lookAt: () => {
            if (selection.list.length == 0) return;

            let center = new Vector3();
            selection.list.forEach((particle) => {
                center.add(particle.position);
            });
            center.divideScalar(selection.list.length);

            cameraTargetSet(center);
        },
        place: () => {
            guiOptions.controls.placeHint();
        },
    },
    generator: {
        mass: "1",
        randomMass: false,
        enableZeroMass: false,
        roundMass: true,

        charge: "1",
        randomCharge: false,
        chargeRandomSignal: true,
        enableZeroCharge: false,
        roundCharge: true,

        nuclearCharge: "1",
        randomNuclearCharge: false,
        nuclearChargeRandomSignal: true,
        enableZeroNuclearCharge: false,
        roundNuclearCharge: true,

        velocity: "1,0,0",
        randomVelocity: true,

        radius: "1",
        quantity: "1",
        pattern: "circle",
        preset: "default",
        fixed: false,
        generate: () => {
            guiGenerate.open();
            particleGenerator();
        },
        clear: () => {
            guiGenerate.close();
        },
        default: () => {
            let clean = {
                mass: "1",
                randomMass: false,
                enableZeroMass: false,
                roundMass: true,

                charge: "1",
                randomCharge: false,
                chargeRandomSignal: true,
                enableZeroCharge: false,
                roundCharge: true,

                nuclearCharge: "1",
                randomNuclearCharge: false,
                nuclearChargeRandomSignal: true,
                enableZeroNuclearCharge: false,
                roundNuclearCharge: true,

                velocity: "1,0,0",
                randomVelocity: true,

                radius: "1",
                quantity: "1",
                pattern: "circle",
                preset: "default",
                fixed: false,
            };
            Object.assign(guiOptions.generator, clean);
        },
    },
    parameters: {
        massConstant: "",
        chargeConstant: "",
        nuclearChargeConstant: "",
        nuclearChargeRange: "",
        boundaryDamping: "",
        boundaryDistance: "",
        minDistance: "",
        forceConstant: "",
        maxParticles: "",
        radius: "",
        radiusRange: "",
        nuclearPotential: NuclearPotentialType.default,
        boxBoundary: false,
        distance1: false,
        enableBoundary: true,
        close: () => {
            guiParameters.close();
        },
    },
    advancedControls: {
        dampKickFactor: "0.1",
        randomVelocity: "10",
        cleanupThreshold: "8",
        ruler: "",
        reverseVelocity: () => {
            graphics.readbackParticleData();
            graphics.particleList.forEach((p) => {
                p.velocity.multiplyScalar(-1);
            });
            simulation.drawParticles();
        },
        zeroVelocity: () => {
            graphics.readbackParticleData();
            graphics.particleList.forEach((p) => {
                p.velocity.set(0, 0, 0);
            });
            simulation.drawParticles();
        },
        particleCleanup: () => {
            let thresh = parseFloat(guiOptions.advancedControls.cleanupThreshold);
            if (isNaN(thresh)) {
                alert("Invalid threshold.");
                return;
            }
            simulationParticleAutoCleanup(thresh);
        },
        dampVelocity: () => {
            let factor = parseFloat(guiOptions.advancedControls.dampKickFactor);
            graphics.readbackParticleData();
            graphics.particleList.forEach((p) => {
                p.velocity.multiplyScalar(1.0 - factor);
            });
            simulation.drawParticles();
        },
        kickVelocity: () => {
            let factor = parseFloat(guiOptions.advancedControls.dampKickFactor);
            graphics.readbackParticleData();
            graphics.particleList.forEach((p) => {
                p.velocity.multiplyScalar(1.0 + factor);
            });
            simulation.drawParticles();
        },
        addRandomVelocity: () => {
            graphics.readbackParticleData();
            graphics.particleList.forEach((p) => {
                let e = parseFloat(guiOptions.advancedControls.randomVelocity);
                if (isNaN(e)) return;
                p.velocity.add(randomSphericVector(0, e, simulation.mode2D));
            });
            simulation.drawParticles();
        },
        zeroPosition: () => {
            graphics.readbackParticleData();
            graphics.particleList.forEach((p) => {
                p.position = randomSphericVector(0, 1, simulation.mode2D);
            });
            simulation.drawParticles();
        },
        close: () => {
            guiAdvancedControls.close();
        },
    },
    field: {
        enabled: false,
        m: '1',
        q: '1',
        nq: '1',
        grid: '50',
        fieldResize: () => {
            simulation.field.resize();
        },
        close: () => {
            guiField.close();
        }
    },
}

const mouseHelper = new MouseHelper();
let selection = new SelectionHelper();
const keyboard = new Keyboard(mouseHelper, guiOptions, simulation);

function showCursor() {
    guiOptions.controls.showCursor = true;
    let radius = Math.max(2 * simulation.particleRadius, 10);
    let thick = Math.max(0.1 * radius, 1);
    mouseHelper.showCursor(graphics, radius, thick);
}

function setup(idx) {
    log("setup " + idx);
    guiSelectionClose();
    guiParticleClose();

    simulationSetup(idx);

    guiParametersRefresh();
    guiInfoRefresh();
    guiOptions.generator.default();
    guiFieldRefresh();

    energyPanel.min = 0;
    energyPanel.max = 0;

    if (guiOptions.controls.showCursor == true) {
        showCursor();
    }
}

export function guiSetup() {
    window.onresize = onWindowResize;
    document.addEventListener("keydown", e => keyboard.onKeyDown(keyboard, e));
    document.addEventListener("keyup", e => keyboard.onKeyUp(keyboard, e));

    window.addEventListener('pointermove', onPointerMove);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);

    //stats overlay
    document.getElementById("container").appendChild(statsPanel.domElement);
    mouseHelper.addListener(statsPanel.domElement);
    statsPanel.domElement.style.visibility = "visible";

    //gui menu overlay
    mouseHelper.addListener(gui.domElement);
    gui.width = Math.max(0.2 * window.innerWidth, 320);

    guiInfoSetup();
    guiControlsSetup();
    guiParticleSetup();
    guiParametersSetup();
    guiSelectionSetup();
    guiGeneratorSetup();
    guiAdvancedControlsSetup();
    guiFieldSetup();

    setup();
}

function guiInfoSetup() {
    guiInfo.add(guiOptions.info, 'name').name('Name').listen().onFinishChange((val) => {
        simulation.name = val;
    });
    guiInfo.add(guiOptions.info, 'folderName').name('Folder').listen();
    guiInfo.add(guiOptions.info, 'particles').name('Particles').listen();
    guiInfo.add(guiOptions.info, 'time').name('Time').listen();
    guiInfo.add(guiOptions.info, 'mode2D').name('2D Mode').listen().onFinishChange((val) => {
        simulation.bidimensionalMode(val);
    });
    guiInfo.add(guiOptions.info, 'cameraPosition').name('Camera Coordinates').listen().onFinishChange((val) => {
        let p = decodeVector3(val);
        if (p == undefined) {
            alert("Invalid coordinates!");
            return;
        }
        graphics.camera.position.set(p.x, p.y, p.z);
        graphics.controls.target.set(p.x, p.y, 0);
        graphics.controls.update();
    });
    guiInfo.open();

    const guiInfoMore = guiInfo.addFolder("[+] More Information...");
    guiInfoMore.add(guiOptions.info, 'energy').name('Energy (avg)').listen();
    guiInfoMore.add(guiOptions.info, 'velocity').name('Velocity (avg)').listen();
    guiInfoMore.add(guiOptions.info, 'mass').name('Mass (sum)').listen().onFinishChange((val) => {
        simulationUpdateParticleList("mass", val);
    });
    guiInfoMore.add(guiOptions.info, 'charge').name('Charge (sum)').listen().onFinishChange((val) => {
        simulationUpdateParticleList("charge", val);
    });
    guiInfoMore.add(guiOptions.info, 'collisions').name('Collisions').listen();
    guiInfoMore.add(guiOptions.info, 'autoRefresh').name('Automatic Refresh').listen().onFinishChange((val) => {
        autoRefresh = val;
    });

    collapseList.push(guiInfo);
    collapseList.push(guiInfoMore);
}

function guiInfoRefresh(now) {
    let [name, n, t, e, c, m, r, totalTime, totalCharge] = simulation.state();

    guiOptions.info.name = name;
    guiOptions.info.folderName = simulation.folderName;
    guiOptions.info.particles = n + " / " + graphics.maxParticles;

    let realTime = new Date(totalTime).toISOString().substring(11, 19);
    guiOptions.info.time = realTime + " (" + t + ")";

    n = (n == 0) ? (1) : (n);
    m = (m == 0) ? (1) : (m);
    let avgEnergy = e / n;
    let avgVelocity = Math.sqrt(e / m);
    guiOptions.info.energy = avgEnergy.toExponential(2);
    guiOptions.info.velocity = avgVelocity.toExponential(2);

    guiOptions.info.collisions = c;
    guiOptions.info.mass = m.toExponential(2);
    guiOptions.info.charge = totalCharge.toExponential(2);
    //guiOptions.info.radius = r.toExponential(2);
    //guiOptions.info.cameraDistance = graphics.controls.getDistance().toExponential(2);
    let position = graphics.camera.position.toArray();
    position.forEach((val, idx) => {
        position[idx] = val.toExponential(1);
    });
    guiOptions.info.cameraPosition = position;
    guiOptions.info.mode2D = simulation.mode2D;

    let energy = avgVelocity;
    if (energy > energyPanel.max) energyPanel.max = energy;
    energyPanel.update(energy, energyPanel.max);
}

function guiControlsSetup() {
    guiControls.add(guiOptions.controls, 'mouseHint').name("Mouse Controls (click for more...)");
    guiControls.add(guiOptions.controls, 'placeHint').name("Place particles [Z] (click for more...)");

    const guiControlsSimulation = guiControls.addFolder("[+] Simulation");
    guiControlsSimulation.add(guiOptions.controls, 'pauseResume').name("Pause/Resume [SPACE]");
    guiControlsSimulation.add(guiOptions.controls, 'step').name("Step [N] (if paused)");
    guiControlsSimulation.add(guiOptions.controls, 'reset').name("Reset [R]");
    guiControlsSimulation.add(guiOptions.controls, 'next').name("Next simulation [PAGEDOWN]");
    guiControlsSimulation.add(guiOptions.controls, 'previous').name("Previous simulation [PAGEUP]");
    guiControlsSimulation.add(guiOptions.controls, 'home').name("First simulation [HOME]");

    const guiControlsCamera = guiControls.addFolder("[+] Camera");
    guiControlsCamera.add(guiOptions.controls, 'resetCamera').name("Reset Camera [C]");
    guiControlsCamera.add(guiOptions.controls, 'xyCamera').name("XY Camera [V]");

    const guiControlsView = guiControls.addFolder("[+] View");
    guiControlsView.add(guiOptions.controls, 'hideAxis').name("Hide/Show Axis [A]");
    guiControlsView.add(guiOptions.controls, 'colorMode').name("Color Mode [Q]");
    guiControlsView.add(guiOptions.controls, 'hideOverlay').name("Hide Overlay [H]");
    guiControlsView.add(guiOptions.controls, 'collapseAll').name("Collapse all folders [M]");
    guiControlsView.add(guiOptions.controls, 'showCursor').name("Show Cursor").listen().onFinishChange((val) => {
        if (val == true) {
            showCursor();
        } else {
            mouseHelper.hideCursor();
            guiOptions.controls.showCursor = false;
        }
    });

    guiControls.add(guiOptions.controls, 'sandbox').name("Sandbox Mode [S]");
    guiControls.add(guiOptions.controls, 'snapshot').name("Export simulation [P]");
    guiControls.add(guiOptions.controls, 'import').name("Import simulation");
    guiControls.add(guiOptions.controls, 'deleteAll').name("Delete all particles [DEL]");

    guiControls.add(guiOptions.controls, 'close').name("Close");

    collapseList.push(guiControls);
    collapseList.push(guiControlsCamera);
    collapseList.push(guiControlsSimulation);
    collapseList.push(guiControlsView);
}

function guiParticleSetup() {
    guiParticle.add(guiOptions.particle, 'id').name('ID').listen().onFinishChange((val) => {
        let obj = simulationFindParticle(parseInt(val));
        if (obj == undefined) {
            if (simulation.physics.particleList == undefined ||
                simulation.physics.particleList.length == 0) {
                alert("There's no particle in the simulation!");
            } else {
                alert("Particle not found!\n" +
                    "Hint: the first one is " + simulation.physics.particleList[0].id);
            }
            return;
        }
        guiOptions.particle.obj = obj;
    });
    guiParticle.addColor(guiOptions.particle, 'color').name('Color').listen();
    guiParticle.add(guiOptions.particle, 'energy').name('Energy').listen();

    const guiParticleProperties = guiParticle.addFolder("[+] Properties");
    guiParticleProperties.add(guiOptions.particle, 'mass').name('Mass').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "mass", val);
    });
    guiParticleProperties.add(guiOptions.particle, 'charge').name('Charge').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "charge", val);
    });
    guiParticleProperties.add(guiOptions.particle, 'nuclearCharge').name('Nuclear Charge').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "nuclearCharge", val);
    });
    guiParticleProperties.open();

    const guiParticleVariables = guiParticle.addFolder("[+] Variables");
    guiParticleVariables.add(guiOptions.particle, 'position').name('Position').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "position", val);
    });
    guiParticleVariables.add(guiOptions.particle, 'velocityAbs').name('Velocity').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "velocityAbs", val);
    });
    guiParticleVariables.add(guiOptions.particle, 'velocityDir').name('Direction').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "velocityDir", val);
    });
    guiParticleVariables.add(guiOptions.particle, 'fixed').name('Fixed position?').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "fixed", val);
    });
    //guiParticleVariables.open();

    const guiParticleActions = guiParticle.addFolder("[+] Actions");
    guiParticleActions.add(guiOptions.particle, 'follow').name('Follow/Unfollow');
    guiParticleActions.add(guiOptions.particle, 'lookAt').name('Look At');
    guiParticleActions.add(guiOptions.particle, 'reset').name('Reset Attributes');
    guiParticle.add(guiOptions.particle, 'close').name('Close');

    collapseList.push(guiParticle);
    collapseList.push(guiParticleActions);
    collapseList.push(guiParticleVariables);
    collapseList.push(guiParticleProperties);
}

function guiParticleRefresh() {
    let particleView = guiOptions.particle;
    let particle = particleView.obj;

    if (particle) {
        //static info
        particleView.id = particle.id;
        particleView.mass = particle.mass.toExponential(3);
        particleView.charge = particle.charge.toExponential(3);
        particleView.nuclearCharge = particle.nuclearCharge;
        particleView.fixed = (particle.type == ParticleType.fixed);

        let color = particle.color;
        if (particle.mesh) {
            color = particle.mesh.material.color;
        }
        particleView.color = "#" + color.getHexString();//arrayToString(color.toArray(), 2);

        //dynamic info
        let position = [];
        particle.position.toArray().forEach(element => {
            position.push(element.toExponential(3));
        });
        particleView.position = position;
        particleView.velocityDir = arrayToString(
            particle.velocity.clone().normalize().toArray(), 3);
        particleView.velocityAbs = particle.velocity.length().toExponential(3);
        particleView.energy = particle.energy().toExponential(3);
    }
}

function guiSelectionSetup() {
    guiSelection.add(guiOptions.selection, 'source').name("Source").listen();
    guiSelection.add(guiOptions.selection, 'particles').name("Particles").listen();

    const guiSelectionProperties = guiSelection.addFolder("[+] Properties");
    guiSelection.guiSelectionProperties = guiSelectionProperties;
    guiSelectionProperties.add(guiOptions.selection, 'mass').name("Mass (sum)").listen().onFinishChange((val) => {
        selectionListUpdate("mass", val);
    });
    guiSelectionProperties.add(guiOptions.selection, 'charge').name("Charge (sum)").listen().onFinishChange((val) => {
        selectionListUpdate("charge", val);
    });
    guiSelectionProperties.add(guiOptions.selection, 'nuclearCharge').name("Nuclear Charge (sum)").listen().onFinishChange((val) => {
        selectionListUpdate("nuclearCharge", val);
    });

    const guiSelectionVariables = guiSelection.addFolder("[+] Variables");
    guiSelectionVariables.add(guiOptions.selection, 'velocity').name("Velocity").listen().onFinishChange((val) => {
        selectionListUpdate("velocityAbs", val);
    });
    guiSelectionVariables.add(guiOptions.selection, 'velocityDir').name("Direction").listen().onFinishChange((val) => {
        selectionListUpdate("velocityDir", val);
    });
    guiSelectionVariables.add(guiOptions.selection, 'center').name("Center").listen().onFinishChange((val) => {
        selectionListUpdate("center", val);
    });
    guiSelectionVariables.add(guiOptions.selection, 'fixedPosition').name("Fixed Position").listen().onFinishChange((val) => {
        selectionListUpdate("fixed", val);
        guiOptions.selection.fixedPosition = val;
    });

    const guiSelectionActions = guiSelection.addFolder("[+] Actions");
    guiSelectionActions.add(guiOptions.selection, 'delete').name("Delete [D]"); // [BACKSPACE]
    guiSelectionActions.add(guiOptions.selection, 'clone').name("Clone [X]");
    guiSelectionActions.add(guiOptions.selection, 'lookAt').name("Look At");
    guiSelectionActions.add(guiOptions.selection, 'export').name("Export");
    guiSelectionActions.add(guiOptions.selection, 'import').name("Import");
    guiSelectionActions.add(guiOptions.selection, 'place').name("Place [Z]");

    guiSelection.add(guiOptions.selection, 'clear').name("Close");

    collapseList.push(guiSelection);
    collapseList.push(guiSelectionActions);
    collapseList.push(guiSelectionProperties);
    collapseList.push(guiSelectionVariables);
}

function guiGeneratorSetup() {
    guiGenerate.add(guiOptions.generator, "quantity").name("Particles").listen().onFinishChange((val) => {
        guiOptions.generator.quantity = Math.round(parseFloat(val));
    });
    guiGenerate.add(guiOptions.generator, "radius").name("Brush radius").listen().onFinishChange((val) => {
        guiOptions.generator.radius = parseFloat(val);
    });

    function defaultTemplate() {
        guiOptions.generator.mass = "1";
        guiOptions.generator.randomMass = false;
        guiOptions.generator.enableZeroMass = false;
        guiOptions.generator.roundMass = false;

        guiOptions.generator.charge = "1";
        guiOptions.generator.randomCharge = false;
        guiOptions.generator.chargeRandomSignal = false;
        guiOptions.generator.enableZeroCharge = true;
        guiOptions.generator.roundCharge = false;

        guiOptions.generator.nuclearCharge = "1";
        guiOptions.generator.randomNuclearCharge = false;
        guiOptions.generator.nuclearChargeRandomSignal = true;
        guiOptions.generator.enableZeroNuclearCharge = false;
        guiOptions.generator.roundNuclearCharge = true;
    }

    function beamTemplate(v) {
        guiOptions.generator.velocity = v + ",0,0";
        guiOptions.generator.randomVelocity = false;
    }

    const patternList = {
        circle: "circle",
        square: "square",
        hexagon: "hexagon",
        beam: "beam",
    };
    guiGenerate.add(guiOptions.generator, "pattern", patternList).name("Brush pattern").listen().onFinishChange((val) => {
        switch (val) {
            case "beam":
                let v = 10 * parseFloat(guiOptions.info.velocity);
                if (isNaN(v) || v < 1e2) v = 1e2;
                beamTemplate(v);
                guiOptions.generator.quantity = 16;
                break;

            default:
                break;
        }
    });

    const presetList = {
        default: "default",
        stdModel0: "stdModel0",
        randomClone: "randomClone",
        eBeam: "eBeam",
        alphaBeam: "alphaBeam",
        epnModel: "epnModel",
    };
    guiGenerate.add(guiOptions.generator, "preset", presetList).name("Particle preset").listen().onFinishChange((val) => {
        console.log(val);

        let v = 10 * parseFloat(guiOptions.info.velocity);
        if (isNaN(v) || v < 1e2) v = 1e2;
        switch (val) {
            case "eBeam":
                defaultTemplate();
                beamTemplate(v);
                guiOptions.generator.quantity = "32";
                break;

            case "alphaBeam":
                defaultTemplate();
                beamTemplate(v);
                guiOptions.generator.quantity = "24";
                guiOptions.generator.nuclearChargeRandomSignal = false;
                break;

            case "epnModel":
            case "stdModel0":
            case "randomClone":
                defaultTemplate();
                break;

            default:
                guiOptions.generator.default();
                break;
        }
    });

    const guiGenerateMass = guiGenerate.addFolder("[+] Mass");
    guiGenerateMass.add(guiOptions.generator, "mass").name("Mass").listen().onFinishChange((val) => {
        guiOptions.generator.mass = parseFloat(val);
    });
    guiGenerateMass.add(guiOptions.generator, "randomMass").name("Randomize value?").listen();
    guiGenerateMass.add(guiOptions.generator, "enableZeroMass").name("Allow zero?").listen();
    guiGenerateMass.add(guiOptions.generator, "roundMass").name("Round?").listen();
    //guiGenerateMass.open();

    const guiGenerateCharge = guiGenerate.addFolder("[+] Charge");
    guiGenerateCharge.add(guiOptions.generator, "charge").name("Charge").listen().onFinishChange((val) => {
        guiOptions.generator.charge = parseFloat(val);
    });
    guiGenerateCharge.add(guiOptions.generator, "randomCharge").name("Randomize value?").listen();
    guiGenerateCharge.add(guiOptions.generator, "chargeRandomSignal").name("Randomize signal?").listen();
    guiGenerateCharge.add(guiOptions.generator, "enableZeroCharge").name("Allow zero?").listen();
    guiGenerateCharge.add(guiOptions.generator, "roundCharge").name("Round?").listen();
    //guiGenerateCharge.open();

    const guiGenerateNuclearCharge = guiGenerate.addFolder("[+] Nuclear Charge");
    guiGenerateNuclearCharge.add(guiOptions.generator, "nuclearCharge").name("Nuclear Charge").listen().onFinishChange((val) => {
        guiOptions.generator.nuclearCharge = parseFloat(val);
    });
    guiGenerateNuclearCharge.add(guiOptions.generator, "randomNuclearCharge").name("Randomize value?").listen();
    guiGenerateNuclearCharge.add(guiOptions.generator, "nuclearChargeRandomSignal").name("Randomize signal?").listen();
    guiGenerateNuclearCharge.add(guiOptions.generator, "enableZeroNuclearCharge").name("Allow zero?").listen();
    guiGenerateNuclearCharge.add(guiOptions.generator, "roundNuclearCharge").name("Round?").listen();

    const guiGenerateVelocity = guiGenerate.addFolder("[+] Velocity");
    guiGenerateVelocity.add(guiOptions.generator, "velocity").name("Velocity").listen().onFinishChange((val) => {
        const precision = 2;
        let velocity = decodeVector3(val);
        if (velocity != undefined) {
            guiOptions.generator.velocity = floatArrayToString([velocity.x, velocity.y, velocity.z], precision);
            return;
        }
        velocity = parseFloat(val);
        if (isNaN(velocity)) {
            alert("Invalid velocity.");
            return;
        }
        guiOptions.generator.velocity = floatArrayToString([velocity, 0, 0], precision);
    });
    guiGenerateVelocity.add(guiOptions.generator, "randomVelocity").name("Randomize?").listen();

    guiGenerate.add(guiOptions.generator, "fixed").name("Fixed position?").listen();
    guiGenerate.add(guiOptions.generator, "generate").name("Generate [G]");
    guiGenerate.add(guiOptions.generator, "default").name("Default Values");
    guiGenerate.add(guiOptions.generator, "clear").name("Close");

    collapseList.push(guiGenerate);
    collapseList.push(guiGenerateCharge);
    collapseList.push(guiGenerateMass);
    collapseList.push(guiGenerateVelocity);
}

function guiParametersSetup() {
    guiParameters.add(guiOptions.parameters, 'maxParticles').name("Max Particles").listen().onFinishChange((val) => {
        val = parseFloat(val);
        if (val == simulation.physics.particleList.length) {
            return;
        }
        if (val > simulation.physics.particleList.length) {
            graphics.readbackParticleData();
            graphics.setMaxParticles(val);
            simulation.drawParticles();
            return;
        }
        graphics.setMaxParticles(val);
        setup();
    });

    const guiParametersConsts = guiParameters.addFolder("[+] Constants");
    guiParametersConsts.add(guiOptions.parameters, 'massConstant').name("Gravitational Constant").listen().onFinishChange((val) => {
        simulationUpdatePhysics("massConstant", val);
    });
    guiParametersConsts.add(guiOptions.parameters, 'chargeConstant').name("Electric Constant").listen().onFinishChange((val) => {
        simulationUpdatePhysics("chargeConstant", val);
    });
    guiParametersConsts.add(guiOptions.parameters, 'nuclearChargeConstant').name("Nuclear Force Constant").listen().onFinishChange((val) => {
        simulationUpdatePhysics("nuclearChargeConstant", val);
    });
    guiParametersConsts.add(guiOptions.parameters, 'nuclearChargeRange').name("Nuclear Force Range").listen().onFinishChange((val) => {
        simulationUpdatePhysics("nuclearChargeRange", val);
    });
    guiParametersConsts.add(guiOptions.parameters, 'forceConstant').name("Force Multiplier").listen().onFinishChange((val) => {
        simulationUpdatePhysics("forceConstant", val);
    });
    guiParametersConsts.add(guiOptions.parameters, 'minDistance').name("Minimum Distance").listen().onFinishChange((val) => {
        let d = parseFloat(val);
        if (isNaN(d)) {
            alert("Invalid value.");
            return;
        }
        simulationUpdatePhysics("minDistance2", Math.pow(d, 2));
    });
    //guiParametersConsts.open();

    const guiParametersBoundary = guiParameters.addFolder("[+] Boundary");
    guiParametersBoundary.add(guiOptions.parameters, 'boundaryDistance').name("Boundary Distance").listen().onFinishChange((val) => {
        simulationUpdatePhysics("boundaryDistance", val);
    });
    guiParametersBoundary.add(guiOptions.parameters, 'boundaryDamping').name("Boundary Damping Factor").listen().onFinishChange((val) => {
        simulationUpdatePhysics("boundaryDamping", val);
    });
    guiParametersBoundary.add(guiOptions.parameters, 'boxBoundary').name("Use box boundary").listen().onFinishChange((val) => {
        simulationUpdatePhysics("boxBoundary", val);
    });
    guiParametersBoundary.add(guiOptions.parameters, 'enableBoundary').name("Enable Boundary").listen().onFinishChange((val) => {
        simulationUpdatePhysics("enableBoundary", val);
    });
    //guiParametersBoundary.open();

    const guiParametersVisual = guiParameters.addFolder("[+] View");
    guiParametersVisual.add(guiOptions.parameters, 'radius').name("Particle Radius").listen().onFinishChange((val) => {
        simulationUpdatePhysics("radius", val);
    });
    guiParametersVisual.add(guiOptions.parameters, 'radiusRange').name("Particle Radius Range").listen().onFinishChange((val) => {
        simulationUpdatePhysics("radiusRange", val);
    });

    const guiParametersInteractions = guiParameters.addFolder("[+] Interactions");
    guiParametersInteractions.add(guiOptions.parameters, 'nuclearPotential', NuclearPotentialType).name("Nuclear Potential").listen().onFinishChange((val) => {
        simulationUpdatePhysics("potential", val);
    });
    guiParametersInteractions.add(guiOptions.parameters, 'distance1').name("Use 1/x potential (gravity/charge)").listen().onFinishChange((val) => {
        simulationUpdatePhysics("distance1", val);
    });

    guiParameters.add(guiOptions.parameters, 'close').name("Close");

    collapseList.push(guiParameters);
    collapseList.push(guiParametersBoundary);
    collapseList.push(guiParametersConsts);
    collapseList.push(guiParametersVisual);
    collapseList.push(guiParametersInteractions);
}

function guiParametersRefresh() {
    let edit = guiOptions.parameters;
    edit.massConstant = simulation.physics.massConstant.toExponential(2);
    edit.chargeConstant = simulation.physics.chargeConstant.toExponential(2);
    edit.nuclearChargeConstant = simulation.physics.nuclearChargeConstant.toExponential(2);
    edit.nuclearChargeRange = simulation.physics.nuclearChargeRange.toExponential(2);
    edit.boundaryDamping = simulation.physics.boundaryDamping;
    edit.boundaryDistance = simulation.physics.boundaryDistance.toExponential(2);
    edit.minDistance = Math.sqrt(simulation.physics.minDistance2);
    edit.forceConstant = simulation.physics.forceConstant;
    edit.radius = simulation.particleRadius;
    edit.radiusRange = simulation.particleRadiusRange;
    edit.maxParticles = graphics.maxParticles;
    edit.boxBoundary = simulation.physics.useBoxBoundary;
    edit.distance1 = simulation.physics.useDistance1;
    edit.nuclearPotential = simulation.physics.nuclearPotential;
    edit.enableBoundary = simulation.physics.enableBoundary;
}

function guiAdvancedControlsSetup() {
    guiAdvancedControls.add(guiOptions.advancedControls, 'zeroVelocity').name("Zero Velocity [B]"); // [Numpad 0]
    guiAdvancedControls.add(guiOptions.advancedControls, 'reverseVelocity').name("Reverse Velocity");

    guiAdvancedControls.add(guiOptions.advancedControls, 'dampVelocity').name("Damp Velocity [T]"); // [Numpad -]
    guiAdvancedControls.add(guiOptions.advancedControls, 'kickVelocity').name("Kick Velocity [Y]"); // [Numpad +]
    guiAdvancedControls.add(guiOptions.advancedControls, 'dampKickFactor').name("Damp/Kick Factor").listen().onFinishChange((val) => {
        let factor = parseFloat(val);
        if (isNaN(factor) || factor > 1.0 || factor < 0.0) {
            alert("Factor must be between 0.0 and 1.0.");
            guiOptions.advancedControls.dampKickFactor = "0.1";
            return;
        }
        guiOptions.advancedControls.dampKickFactor = factor.toString();
    });

    guiAdvancedControls.add(guiOptions.advancedControls, 'addRandomVelocity').name("Add Random Velocity");
    guiAdvancedControls.add(guiOptions.advancedControls, 'randomVelocity').name("Random Velocity").listen();

    guiAdvancedControls.add(guiOptions.advancedControls, 'particleCleanup').name("Automatic Particle Cleanup [U]"); // [Numpad .]
    guiAdvancedControls.add(guiOptions.advancedControls, 'cleanupThreshold').name("Cleanup Threshold").listen();
    guiAdvancedControls.add(guiOptions.advancedControls, 'zeroPosition').name("Zero Position");
    guiAdvancedControls.add(guiOptions.advancedControls, 'ruler').name("Selection Ruler").listen();
    guiAdvancedControls.add(guiOptions.advancedControls, 'close').name("Close");

    collapseList.push(guiAdvancedControls);
}

function guiFieldSetup() {
    guiField.add(guiOptions.field, 'enabled').name("Enabled").listen().onFinishChange(val => {
        const f = simulation.field;
        guiOptions.field.enabled = false;
        if (val == false) {
            f.cleanup();
        } else {
            let grid = Math.round(parseFloat(guiOptions.field.grid));
            if (isNaN(grid)) {
                alert("Invalid value.");
                return;
            }
            if (!f.setup(f.mode, grid)) {
                return;
            }
            simulation.drawParticles();
            guiOptions.field.enabled = true;
        }
    });
    guiField.add(guiOptions.field, 'grid').name("Grid").listen().onFinishChange(val => {
        /*const grid = parseFloat(val);
        if (isNaN(grid)) {
            alert("Invalid value.");
            return;
        }
        const f = simulation.field;
        f.cleanup();
        f.setup(f.mode, grid);*/
    });
    guiField.add(guiOptions.field, 'm').name("Mass").listen().onFinishChange(val => {
        const f = simulation.field;
        const m = parseFloat(val);
        if (isNaN(m)) {
            alert("Invalid value.");
            return;
        }
        simulation.field.probeParam.m = m;
        guiOptions.field.m = m.toExponential(2);
        guiOptions.field.fieldResize();
    });
    guiField.add(guiOptions.field, 'q').name("Charge").listen().onFinishChange(val => {
        const f = simulation.field;
        const q = parseFloat(val);
        if (isNaN(q)) {
            alert("Invalid value.");
            return;
        }
        simulation.field.probeParam.q = q;
        guiOptions.field.q = q.toExponential(2);
        guiOptions.field.fieldResize();
    });
    guiField.add(guiOptions.field, 'nq').name("Nuclear Charge").listen().onFinishChange(val => {
        const f = simulation.field;
        const nq = parseFloat(val);
        if (isNaN(nq)) {
            alert("Invalid value.");
            return;
        }
        simulation.field.probeParam.nq = nq;
        guiOptions.field.nq = nq.toExponential(2);
        guiOptions.field.fieldResize();
    });
    guiField.add(guiOptions.field, 'fieldResize').name("Refresh [F]");
    guiField.add(guiOptions.field, 'close').name("Close");
}

function guiFieldRefresh() {
    let opt = guiOptions.field;
    let field = simulation.field;
    opt.enabled = field.enabled;
    opt.m = field.probeParam.m.toExponential(2);
    opt.q = field.probeParam.q.toExponential(2);
    opt.nq = field.probeParam.nq.toExponential(2);
    opt.grid = field.grid[0];
}

function guiParticleClose(clear = true) {
    followParticle = false;
    if (clear) {
        let particleView = guiOptions.particle;
        particleView.obj = undefined;
        particleView.id = "";
        particleView.mass = "";
        particleView.charge = "";
        particleView.nuclearCharge = "";
        particleView.color = "";
        particleView.position = "";
        particleView.velocityDir = "";
        particleView.velocityAbs = "";
        particleView.energy = "";
        particleView.fixed = false;
    }
    guiParticle.close();
}

function guiSelectionClose(clear = true) {
    if (clear) selection.clear();
    guiSelection.close();
}

function selectionListUpdate(param, val) {
    simulationUpdateParticleList(param, val, selection.list);
    selection.guiRefresh();
}

function selectionPlace() {
    if (mouseHelper.overGUI) return;
    if (selection.list == undefined || selection.list.length == 0) return;

    let center = cameraToWorldCoord(mouseHelper.position, graphics.camera, 0);
    if (simulation.mode2D) {
        center.z = 0;
    }

    if (selection.source == SourceType.generated) {
        particleGenerator();
    }

    if (selection.source == SourceType.simulation) {
        simulationUpdateParticleList("center", [center.x, center.y, center.z].toString(), selection.list);
    } else {
        simulationCreateParticleList(selection.list, center);
    }
}1

function snapshot() {
    let name = simulation.state()[0];
    let finalName = exportFilename(name)
    log("snapshot " + finalName);

    graphics.update();
    graphics.renderer.domElement.toBlob((blob) => {
        downloadFile(blob, finalName + ".png", "image/png");
    }, 'image/png', 1);
    downloadFile(simulationExportCsv(), finalName + ".csv", "text/plain;charset=utf-8");
}

let hexagonMap = new Map();
function particleGenerator() {
    log("generateParticles");

    function generateMass() {
        let m = presetList[presetIdx].m;
        m *= mass;
        if (guiOptions.generator.randomMass) m *= random(0, 1);
        if (guiOptions.generator.roundMass) m = Math.round(m);
        if (!guiOptions.generator.enableZeroMass && m == 0) m = mass;
        return m;
    }

    function generateCharge() {
        let s = 1;
        let q = presetList[presetIdx].q;
        q *= charge;
        if (guiOptions.generator.chargeRandomSignal) s = random(0, 1, true) ? -1 : 1;
        if (guiOptions.generator.randomCharge) q *= random(0, 1);
        if (guiOptions.generator.roundCharge) q = Math.round(q);
        if (!guiOptions.generator.enableZeroCharge && q == 0) q = charge;
        return s * q;
    }

    function generateNuclearCharge() {
        let s = 1;
        let nq = presetList[presetIdx].nq;
        nq *= nuclearCharge;
        if (guiOptions.generator.nuclearChargeRandomSignal) s = random(0, 1, true) ? -1 : 1;
        if (guiOptions.generator.randomNuclearCharge) nq *= random(0, 1);
        if (guiOptions.generator.roundNuclearCharge) nq = Math.round(nq);
        if (!guiOptions.generator.enableZeroNuclearCharge && nq == 0) nq = nuclearCharge;
        return s * nq;
    }

    function generatePosition() {
        switch (input.pattern) {
            case "circle":
                return randomSphericVector(0, radius);

            case "square":
                return randomVector(radius);

            case "hexagon":
                {
                    log(hexagonMap.size);
                    if (hexagonMap.size == 0) {
                        generateHexagon(0, 0, radius, hexagonMap);
                        console.log(hexagonMap);
                    }

                    let idx = random(0, 256, true) % (hexagonMap.size);
                    let pos = new Vector3();
                    for (let [key, value] of hexagonMap) {
                        if (idx-- == 0) {
                            pos.set(value.x, value.y, 0);
                            hexagonMap.delete(key);
                            break;
                        }
                    }

                    return pos;
                }

            default:
                return new Vector3();
        }
    }

    function generateVelocity() {
        let v = velocity;
        switch (input.pattern) {
            case "beam":
                break;

            default:
                if (guiOptions.generator.randomVelocity) v = randomSphericVector(0, v.length(), simulation.mode2D);
                break;
        }
        return v;
    }

    let input = guiOptions.generator;
    let mass = parseFloat(input.mass);
    let charge = parseFloat(input.charge);
    let nuclearCharge = parseFloat(input.nuclearCharge);
    let radius = Math.abs(parseFloat(input.radius));
    let quantity = Math.round(parseFloat(input.quantity));
    if (isNaN(mass) || isNaN(charge) || isNaN(nuclearCharge) || isNaN(radius) || isNaN(quantity)) {
        alert("Invalid parameters!");
        return;
    }
    let velocity = decodeVector3(input.velocity);
    if (velocity == undefined) {
        velocity = parseFloat(input.velocity);
        if (isNaN(velocity)) {
            alert("Invalid velocity!");
            return;
        }
        velocity = { x: velocity, y: 0, z: 0 };
    }
    velocity = new Vector3(velocity.x, velocity.y, velocity.z);

    let presetList = [];
    let presetIdx = 0;
    let preset = input.preset;
    switch (preset) {
        case "stdModel0":
            presetList = [
                { m: 0.01, q: 0, nq: 1 },
                { m: 0.511, q: -1, nq: 1 },
                { m: 3, q: 1 / 3, nq: 1 },
                { m: 6, q: -2 / 3, nq: 1 },
            ];
            break;

        case "epnModel":
            presetList = [
                { m: 5.48579909065e-4, q: -1, nq: -1 / 137 },
                { m: 1.007276466583, q: 1, nq: 1 },
                { m: 1.00866491588, q: 0, nq: 1 },
            ];
            break;

        case "randomClone":
            {
                presetList = [];
                for (let i = 0; i < quantity; ++i) {
                    let idx = random(0, simulation.particleList.length - 1, true);
                    let p = simulation.particleList[idx];
                    presetList.push(
                        { m: p.mass, q: p.charge, nq: p.nuclearCharge }
                    );
                }
                console.log(presetList);
            }
            break;

        case "eBeam":
            presetList = [
                { m: 0.511, q: -1, nq: 1 },
            ];
            break;

        case "alphaBeam":
            presetList = [
                { m: 3, q: 1 / 3, nq: 1 },
                { m: 6, q: -2 / 3, nq: 1 },
            ];
            break;

        default:
            presetList = [
                { m: 1, q: 1, nq: 1 },
            ];
            break;
    }

    let newParticleList = [];
    //if (input.pattern == "hexagon") quantity *= 6;
    for (let i = 0; i < quantity; ++i) {
        presetIdx = random(0, presetList.length - 1, true);
        createParticle(
            newParticleList,
            generateMass(),
            generateCharge(),
            generateNuclearCharge(),
            generatePosition(),
            generateVelocity(),
            guiOptions.generator.fixed
        );
    }

    selection = new SelectionHelper(graphics, guiOptions.selection, guiSelection);
    selection.source = SourceType.generated;
    selection.list = newParticleList;
    guiSelection.open();
}

function uploadCsv(callback) {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = ".csv";
    input.onchange = e => {
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = readerEvent => {
            let content = readerEvent.target.result;
            callback(file.name, content);
        }
    }
    input.click();
}

function cameraTargetSet(pos) {
    graphics.camera.position.set(pos.x, pos.y, graphics.controls.getDistance());
    graphics.controls.target.set(pos.x, pos.y, pos.z);
    graphics.controls.update();
}

function onWindowResize() {
    log("window.onresize " + window.innerWidth + "x" + window.innerHeight);
    graphics.onWindowResize(window);
}

function onPointerMove(event) {
    mouseHelper.move(event);
    if (selection.started) {
        selection.update(event);
    }
}

function onPointerDown(event) {
    if (event.button == 0 && event.shiftKey) {
        selection = new SelectionHelper(graphics, guiOptions.selection, guiSelection);
        selection.start(event);
    }
}

function onPointerUp(event) {
    if (event.button == 0 && selection.started) {
        selection.end(event);
        guiOptions.advancedControls.ruler = "len: " + selection.ruler.length().toExponential(3) + " x: " + selection.ruler.x.toExponential(3) + " y: " + selection.ruler.y.toExponential(3);
    } else if (event.button == 0 && !mouseHelper.overGUI) {
        let particle = graphics.raycast(mouseHelper.position);
        if (particle) {
            guiOptions.particle.obj = particle;
            guiParticle.open();
        }
    }
}

export function animate(time) {
    requestAnimationFrame(animate);

    graphics.update();
    statsPanel.update();

    if (followParticle && guiOptions.particle.obj) {
        let x = guiOptions.particle.obj.position;
        cameraTargetSet(x);
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

        if (autoRefresh == true || guiOptions.particle.obj != undefined) {
            graphics.readbackParticleData();
        }

        guiInfoRefresh(time);
        guiParticleRefresh();
        selection.guiRefresh();
        guiParametersRefresh();
    }

    if (!isNaN(time)) lastAnimateTime = time;
}