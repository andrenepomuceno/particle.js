import { Vector3 } from 'three';
import * as dat from 'dat.gui';
import { Particle, ParticleType } from './physics.js';
import { downloadFile, arrayToString, cameraToWorldCoord, decodeVector3, random, floatArrayToString, generateHexagon, exportFilename } from './helpers.js';
import {
    simulationSetup,
    simulationExportCsv,
    graphics,
    useGPU,
    simulationImportCSV,
    simulation,
    simulationUpdatePhysics,
    simulationUpdateParticle,
    simulationFindParticle,
    simulationUpdateParticleList as simulationUpdateParticleList,
    simulationImportSelectionCSV,
    simulationCreateParticles,
    simulationDelete,
    simulationDeleteAll,
} from './simulation.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { SelectionHelper, SourceType } from './selectionHelper.js';
import { createParticlesList, randomSphericVector, randomVector } from './scenarios/helpers.js';
import { MouseHelper } from './mouseHelper';

let hideAxis = false;
let simulationIdx = 0;
let colorMode = "charge";

let nextFrame = false;
let pause = false;
let followParticle = false;
let mouseHelper = new MouseHelper();
const viewUpdateDelay = 1000;
let lastViewUpdate = 0;
let lastAnimateTime = 0;
let updateField = false;
let selection = new SelectionHelper();

let stats = new Stats();
const gui = new dat.GUI();
const guiInfo = gui.addFolder("INFORMATION");
const guiControls = gui.addFolder("CONTROLS (keyboard and mouse shortcuts)");
const guiParticle = gui.addFolder("PARTICLE INFO (click on particle or enter ID)");
const guiSelection = gui.addFolder("PARTICLE SELECTION");
const guiGenerate = gui.addFolder("SELECTION GENERATOR");
const guiParameters = gui.addFolder("SIMULATION PARAMETERS");

function log(msg) {
    console.log("View: " + msg);
}

function setup(idx) {
    log("setup " + idx);
    guiSelectionClose();
    guiParticleClose();
    simulationSetup(idx);
    guiParametersRefresh();
    guiInfoRefresh();
    guiOptions.generator.default();
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
        mode: "",
        cameraPosition: "",
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
            guiParticleClose(false);
            graphics.controls.reset();
        },
        xyCamera: function () {
            guiParticleClose(false);
            cameraTargetSet(new Vector3());
        },
        colorMode: function () {
            (colorMode == "charge") ? (colorMode = "random") : (colorMode = "charge");
            simulation.setColorMode(colorMode);
        },
        placeHint: function () {
            alert(
                'Press "Z" to place a particle selection on the mouse/pointer position.\n' +
                'First, select particles with SHIFT + CLICK + DRAG, then press "Z" to move the particles!\n' +
                'If you want to make clones, press "Clone" on the selection folder.'
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
            if (confirm("Thiss will delete all particles.\nAre you sure?")) {
                simulationDeleteAll();
            }
        },
        sandbox: () => {
            setup(-1);
        },
        hideOverlay: () => {
            let visibility = stats.domElement.style.visibility;
            if (visibility == "visible") {
                stats.domElement.style.visibility = "hidden";
            }
            else {
                stats.domElement.style.visibility = "visible";
            }
        },
        close: () => {
            guiControls.close();
        },
        collapseAll: () => {
            collapseList.forEach((val) => {
                val.close();
            });
        },
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
        source: "",
        particles: 0,
        mass: "",
        charge: "",
        nearCharge: "",
        velocity: "",
        velocityDir: "",
        center: "",
        export: () => {
            selection.export();
        },
        import: () => {
            uploadCsv((name, content) => {
                selection = new SelectionHelper(graphics, guiOptions.selection, guiSelection);
                simulationImportSelectionCSV(selection, name, content);
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
            simulationDelete(selection.list);
            guiSelectionClose();
        }
    },
    generator: {
        mass: "1",
        randomMass: false,
        enableZeroMass: false,
        quantizedMass: true,

        charge: "1",
        randomCharge: false,
        chargeRandomSignal: true,
        enableZeroCharge: false,
        quantizedCharge: true,

        nearCharge: "1",
        randomNearCharge: false,
        nearChargeRandomSignal: true,
        enableZeroNearCharge: false,
        quantizedNearCharge: true,

        velocity: "1,0,0",
        randomVelocity: true,

        radius: "1",
        quantity: "1",
        pattern: "circle",
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
                quantizedMass: true,

                charge: "1",
                randomCharge: false,
                chargeRandomSignal: true,
                enableZeroCharge: false,
                quantizedCharge: true,

                nearCharge: "1",
                randomNearCharge: false,
                nearChargeRandomSignal: true,
                enableZeroNearCharge: false,
                quantizedNearCharge: true,

                velocity: "1,0,0",
                randomVelocity: true,

                radius: "1",
                quantity: "1",
                pattern: "circle",
                fixed: false,
            };
            Object.assign(guiOptions.generator, clean);
        },
    },
    parameters: {
        massConstant: "",
        chargeConstant: "",
        nearChargeConstant: "",
        nearChargeRange: "",
        boundaryDamping: "",
        boundaryDistance: "",
        minDistance2: "",
        forceConstant: "",
        maxParticles: "",
        radius: "",
        radiusRange: "",
        close: () => {
            guiParameters.close();
        },
    },
}

function guiInfoSetup() {
    guiInfo.add(guiOptions.info, 'name').name('Name').listen().onFinishChange((val) => {
        simulation.name = val;
    });
    guiInfo.add(guiOptions.info, 'particles').name('Particles').listen();
    guiInfo.add(guiOptions.info, 'time').name('Time').listen();
    guiInfo.add(guiOptions.info, 'mode').name('Mode').listen();
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

    const guiInfoMore = guiInfo.addFolder("[+] More");
    guiInfoMore.add(guiOptions.info, 'energy').name('Energy (avg)').listen();
    guiInfoMore.add(guiOptions.info, 'mass').name('Mass (sum)').listen().onFinishChange((val) => {
        simulationUpdateParticleList("mass", val);
    });
    guiInfoMore.add(guiOptions.info, 'charge').name('Charge (sum)').listen().onFinishChange((val) => {
        simulationUpdateParticleList("charge", val);
    });
    guiInfoMore.add(guiOptions.info, 'collisions').name('Collisions').listen();
}

function guiControlsSetup() {
    guiControls.add(guiOptions.controls, 'mouseHint').name("Mouse Controls (click for more...)");
    guiControls.add(guiOptions.controls, 'placeHint').name("Place particles [Z] (click for more...)");

    const guiControlsSimulation = guiControls.addFolder("[+] Simulation Controls");
    guiControlsSimulation.add(guiOptions.controls, 'pauseResume').name("Pause/Resume [SPACE]");
    guiControlsSimulation.add(guiOptions.controls, 'step').name("Step [N] (if paused)");
    guiControlsSimulation.add(guiOptions.controls, 'reset').name("Reset [R]");
    guiControlsSimulation.add(guiOptions.controls, 'next').name("Next simulation [PAGEDOWN]");
    guiControlsSimulation.add(guiOptions.controls, 'previous').name("Previous simulation [PAGEUP]");
    guiControlsSimulation.add(guiOptions.controls, 'home').name("First simulation [HOME]");
    guiControlsSimulation.add(guiOptions.controls, 'sandbox').name("Sandbox Mode [S]");

    const guiControlsCamera = guiControls.addFolder("[+] Camera Controls");
    guiControlsCamera.add(guiOptions.controls, 'resetCamera').name("Reset Camera [C]");
    guiControlsCamera.add(guiOptions.controls, 'xyCamera').name("XY Camera [V]");

    const guiControlsView = guiControls.addFolder("[+] Miscellaneous");
    guiControlsView.add(guiOptions.controls, 'hideAxis').name("Hide/Show Axis [A]");
    guiControlsView.add(guiOptions.controls, 'colorMode').name("Color Mode [Q]");
    guiControlsView.add(guiOptions.controls, 'hideOverlay').name("Hide Overlay [H]");
    guiControlsView.add(guiOptions.controls, 'collapseAll').name("Collapse all folders [M]");

    guiControls.add(guiOptions.controls, 'snapshot').name("Export simulation [P]");
    guiControls.add(guiOptions.controls, 'import').name("Import simulation");
    guiControls.add(guiOptions.controls, 'deleteAll').name("Delete all Particles [DEL]");
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
    guiParticleProperties.add(guiOptions.particle, 'nearCharge').name('NearCharge').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "nearCharge", val);
    });
    //guiParticleProperties.open();

    const guiParticleVariables = guiParticle.addFolder("[+] Variables");
    guiParticleVariables.add(guiOptions.particle, 'fixed').name('Fixed position?').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "fixed", val);
    });
    guiParticleVariables.add(guiOptions.particle, 'position').name('Position').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "position", val);
    });
    guiParticleVariables.add(guiOptions.particle, 'velocityAbs').name('Velocity').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "velocityAbs", val);
    });
    guiParticleVariables.add(guiOptions.particle, 'velocityDir').name('Direction').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "velocityDir", val);
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

function guiSelectionSetup() {
    guiSelection.add(guiOptions.selection, 'source').name("Source").listen();
    guiSelection.add(guiOptions.selection, 'particles').name("Particles").listen();

    const guiSelectionProperties = guiSelection.addFolder("[+] Properties");
    guiSelectionProperties.add(guiOptions.selection, 'mass').name("Mass (sum)").listen().onFinishChange((val) => {
        selectionListUpdate("mass", val);
    });
    guiSelectionProperties.add(guiOptions.selection, 'charge').name("Charge (sum)").listen().onFinishChange((val) => {
        selectionListUpdate("charge", val);
    });
    guiSelectionProperties.add(guiOptions.selection, 'nearCharge').name("Near Charge (sum)").listen().onFinishChange((val) => {
        selectionListUpdate("nearCharge", val);
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

    const guiSelectionActions = guiSelection.addFolder("[+] Actions");
    guiSelectionActions.add(guiOptions.selection, 'export').name("Export");
    guiSelectionActions.add(guiOptions.selection, 'import').name("Import");
    guiSelectionActions.add(guiOptions.selection, 'delete').name("Delete [BACKSPACE]");

    guiSelection.add(guiOptions.selection, 'clone').name("Clone [X]");
    guiSelection.add(guiOptions.selection, 'clear').name("Close");

    collapseList.push(guiSelection);
    collapseList.push(guiSelectionActions);
    collapseList.push(guiSelectionProperties);
    collapseList.push(guiSelectionVariables);
}

function guiGenerateSetup() {
    guiGenerate.add(guiOptions.generator, "quantity").name("Particles").listen().onFinishChange((val) => {
        guiOptions.generator.quantity = Math.round(parseFloat(val));
    });
    guiGenerate.add(guiOptions.generator, "radius").name("Brush radius").listen().onFinishChange((val) => {
        guiOptions.generator.radius = parseFloat(val);
    });
    const patternList = { circle: "circle", square: "square", hexagon: "hexagon" };
    guiGenerate.add(guiOptions.generator, "pattern", patternList).name("Brush pattern");

    const guiGenerateMass = guiGenerate.addFolder("[+] Mass");
    guiGenerateMass.add(guiOptions.generator, "mass").name("Mass").listen().onFinishChange((val) => {
        guiOptions.generator.mass = parseFloat(val);
    });
    guiGenerateMass.add(guiOptions.generator, "randomMass").name("Randomize value?").listen();
    guiGenerateMass.add(guiOptions.generator, "enableZeroMass").name("Allow zero?").listen();
    guiGenerateMass.add(guiOptions.generator, "quantizedMass").name("Quantize?").listen();
    //guiGenerateMass.open();

    const guiGenerateCharge = guiGenerate.addFolder("[+] Charge");
    guiGenerateCharge.add(guiOptions.generator, "charge").name("Charge").listen().onFinishChange((val) => {
        guiOptions.generator.charge = parseFloat(val);
    });
    guiGenerateCharge.add(guiOptions.generator, "randomCharge").name("Randomize value?").listen();
    guiGenerateCharge.add(guiOptions.generator, "chargeRandomSignal").name("Randomize signal?").listen();
    guiGenerateCharge.add(guiOptions.generator, "enableZeroCharge").name("Allow zero?").listen();
    guiGenerateCharge.add(guiOptions.generator, "quantizedCharge").name("Quantize?").listen();
    //guiGenerateCharge.open();

    const guiGenerateNearCharge = guiGenerate.addFolder("[+] Near Charge");
    guiGenerateNearCharge.add(guiOptions.generator, "nearCharge").name("Near Charge").listen().onFinishChange((val) => {
        guiOptions.generator.nearCharge = parseFloat(val);
    });
    guiGenerateNearCharge.add(guiOptions.generator, "randomNearCharge").name("Randomize value?").listen();
    guiGenerateNearCharge.add(guiOptions.generator, "nearChargeRandomSignal").name("Randomize signal?").listen();
    guiGenerateNearCharge.add(guiOptions.generator, "enableZeroNearCharge").name("Allow zero?").listen();
    guiGenerateNearCharge.add(guiOptions.generator, "quantizedNearCharge").name("Quantize?").listen();

    const guiGenerateVelocity = guiGenerate.addFolder("[+] Velocity");
    guiGenerateVelocity.add(guiOptions.generator, "velocity").name("Velocity").listen().onFinishChange((val) => {
        let velocity = decodeVector3(val);
        if (velocity == undefined) {
            velocity = parseFloat(val);
            if (!isNaN(velocity)) {
                velocity = floatArrayToString([velocity, 0, 0], 2);
            }
        }
        guiOptions.generator.velocity = velocity;
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
    guiParameters.add(guiOptions.parameters, 'maxParticles').name("maxParticles").listen().onFinishChange((val) => {
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

    const guiParametersConsts = guiParameters.addFolder("[+] Physics Constants");
    guiParametersConsts.add(guiOptions.parameters, 'massConstant').name("massConstant").listen().onFinishChange((val) => {
        simulationUpdatePhysics("massConstant", val);
    });
    guiParametersConsts.add(guiOptions.parameters, 'chargeConstant').name("chargeConstant").listen().onFinishChange((val) => {
        simulationUpdatePhysics("chargeConstant", val);
    });
    guiParametersConsts.add(guiOptions.parameters, 'nearChargeConstant').name("nearChargeConstant").listen().onFinishChange((val) => {
        simulationUpdatePhysics("nearChargeConstant", val);
    });
    guiParametersConsts.add(guiOptions.parameters, 'nearChargeRange').name("nearChargeRange").listen().onFinishChange((val) => {
        simulationUpdatePhysics("nearChargeRange", val);
    });
    guiParametersConsts.add(guiOptions.parameters, 'forceConstant').name("forceConstant").listen().onFinishChange((val) => {
        simulationUpdatePhysics("forceConstant", val);
    });
    guiParametersConsts.add(guiOptions.parameters, 'minDistance2').name("minDistance2").listen().onFinishChange((val) => {
        simulationUpdatePhysics("minDistance2", val);
    });
    //guiParametersConsts.open();

    const guiParametersBoundary = guiParameters.addFolder("[+] Boundary");
    guiParametersBoundary.add(guiOptions.parameters, 'boundaryDistance').name("boundaryDistance").listen().onFinishChange((val) => {
        simulationUpdatePhysics("boundaryDistance", val);
    });
    guiParametersBoundary.add(guiOptions.parameters, 'boundaryDamping').name("boundaryDamping").listen().onFinishChange((val) => {
        simulationUpdatePhysics("boundaryDamping", val);
    });
    //guiParametersBoundary.open();

    const guiParametersVisual = guiParameters.addFolder("[+] Visualization");
    guiParametersVisual.add(guiOptions.parameters, 'radius').name("particleRadius").listen().onFinishChange((val) => {
        simulationUpdatePhysics("radius", val);
    });
    guiParametersVisual.add(guiOptions.parameters, 'radiusRange').name("particleRadiusRange").listen().onFinishChange((val) => {
        simulationUpdatePhysics("radiusRange", val);
    });

    guiParameters.add(guiOptions.parameters, 'close').name("Close");

    collapseList.push(guiParameters);
    collapseList.push(guiParametersBoundary);
    collapseList.push(guiParametersConsts);
    collapseList.push(guiParametersVisual);
}

export function guiSetup() {
    window.onresize = onWindowResize;
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener('pointermove', onPointerMove);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointerup", onPointerUp);

    document.getElementById("container").appendChild(stats.dom);
    mouseHelper.addListener(stats.domElement);
    stats.domElement.style.visibility = "visible";

    mouseHelper.addListener(gui.domElement);
    gui.width = Math.max(0.2 * window.innerWidth, 320);

    guiInfoSetup();
    guiControlsSetup();
    guiParticleSetup();
    guiParametersSetup();
    guiSelectionSetup();
    guiGenerateSetup();

    setup();
}

function onWindowResize() {
    log("window.onresize");
    graphics.onWindowResize(window);
}

function onKeyDown(event) {
    if (mouseHelper.overGUI) return;

    let key = event.key.toLowerCase();
    switch (key) {
        case ' ':
            guiOptions.controls.pauseResume();
            break;

        case 'c':
            guiOptions.controls.resetCamera();
            break;

        case 'r':
            guiOptions.controls.reset();
            break;

        case 'p':
            guiOptions.controls.snapshot();
            break;

        case 'd':
            console.log(simulationExportCsv());
            break;

        case 'a':
            guiOptions.controls.hideAxis();
            break;

        case 'v':
            guiOptions.controls.xyCamera();
            break;

        case 'n':
            guiOptions.controls.step();
            break;

        case 'q':
            guiOptions.controls.colorMode();
            break;

        case 'pagedown':
            guiOptions.controls.next();
            break;

        case 'pageup':
            guiOptions.controls.previous();
            break;

        case 'home':
            guiOptions.controls.home();
            break;

        case 'f':
            simulation.fieldSetup("update");
            break;

        case 'h':
            guiOptions.controls.hideOverlay();
            break;

        case 'z':
            if (!mouseHelper.overGUI && selection.list != undefined) {
                selectionPlace();
            }
            break;

        case 'delete':
            guiOptions.controls.deleteAll();
            break;

        case 's':
            guiOptions.controls.sandbox();
            break;

        case 'g':
            guiOptions.generator.generate();
            break;

        case 'x':
            guiOptions.selection.clone();
            break;

        case 'backspace':
            guiOptions.selection.delete();
            break;

        case 'm':
            guiOptions.controls.collapseAll();
            break;

        default:
            log("key = " + key);
            break;

    }
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
    } else if (event.button == 0 && !mouseHelper.overGUI) {
        let particle = graphics.raycast(mouseHelper.position);
        if (particle) {
            guiOptions.particle.obj = particle;
            guiParticle.open();
        }
    }
}

function guiInfoRefresh(now) {
    let [name, n, t, e, c, m, r, totalTime, totalCharge] = simulation.state();
    guiOptions.info.name = name;
    guiOptions.info.particles = n + " / " + graphics.maxParticles;
    let realTime = new Date(totalTime).toISOString().substring(11, 19);
    guiOptions.info.time = realTime + " (" + t + ")";
    guiOptions.info.energy = (e / n).toExponential(2) + " / " + Math.sqrt(e / m).toExponential(2);
    guiOptions.info.collisions = c;
    guiOptions.info.mass = m.toExponential(2);
    guiOptions.info.radius = r.toExponential(2);
    guiOptions.info.charge = totalCharge.toExponential(2);
    guiOptions.info.cameraDistance = graphics.controls.getDistance().toExponential(2);
    let position = graphics.camera.position.toArray();
    position.forEach((val, idx) => {
        position[idx] = val.toExponential(1);
    });
    guiOptions.info.cameraPosition = position;
    guiOptions.info.mode = simulation.mode2D ? "2D" : "3D";
}

function guiParticleRefresh() {
    let particleView = guiOptions.particle;
    let particle = particleView.obj;

    if (particle) {
        //static info
        particleView.id = particle.id;
        particleView.mass = particle.mass.toExponential(3);
        particleView.charge = particle.charge.toExponential(3);
        particleView.nearCharge = particle.nearCharge;
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

function guiParticleClose(clear = true) {
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
        particleView.energy = "";
        particleView.fixed = false;
    }
}

function guiParametersRefresh() {
    let edit = guiOptions.parameters;
    edit.massConstant = simulation.physics.massConstant.toExponential(2);
    edit.chargeConstant = simulation.physics.chargeConstant.toExponential(2);
    edit.nearChargeConstant = simulation.physics.nearChargeConstant.toExponential(2);
    edit.nearChargeRange = simulation.physics.nearChargeRange.toExponential(2);
    edit.boundaryDamping = simulation.physics.boundaryDamping;
    edit.boundaryDistance = simulation.physics.boundaryDistance.toExponential(2);
    edit.minDistance2 = simulation.physics.minDistance2;
    edit.forceConstant = simulation.physics.forceConstant;
    edit.radius = simulation.particleRadius;
    edit.radiusRange = simulation.particleRadiusRange;
    edit.maxParticles = graphics.maxParticles;
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
    if (selection.list.length == 0) return;
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
        simulationCreateParticles(selection.list, center);
    }
}

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
        let m = mass;
        if (guiOptions.generator.randomMass) m *= random(0, 1);
        if (guiOptions.generator.quantizedMass) m = Math.round(m);
        if (!guiOptions.generator.enableZeroMass && m == 0) m = mass;
        return m;
    }

    function generateCharge() {
        let s = 1;
        let q = charge;
        if (guiOptions.generator.chargeRandomSignal) s = random(0, 1, true) ? -1 : 1;
        if (guiOptions.generator.randomCharge) q *= random(0, 1);
        if (guiOptions.generator.quantizedCharge) q = Math.round(q);
        if (!guiOptions.generator.enableZeroCharge && q == 0) q = charge;
        return s * q;
    }

    function generateNearCharge() {
        let s = 1;
        let nq = nearCharge;
        if (guiOptions.generator.nearChargeRandomSignal) s = random(0, 1, true) ? -1 : 1;
        if (guiOptions.generator.randomNearCharge) nq *= random(0, 1);
        if (guiOptions.generator.quantizedNearCharge) nq = Math.round(nq);
        if (!guiOptions.generator.enableZeroNearCharge && nq == 0) nq = nearCharge;
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
        if (guiOptions.generator.randomVelocity) v = randomVector(v.length());
        return v;
    }

    let newParticles = [];

    let input = guiOptions.generator;
    let mass = parseFloat(input.mass);
    let charge = parseFloat(input.charge);
    let nearCharge = parseFloat(input.nearCharge);
    let radius = Math.abs(parseFloat(input.radius));
    let quantity = Math.round(parseFloat(input.quantity));
    if (isNaN(mass) || isNaN(charge) || isNaN(nearCharge) || isNaN(radius) || isNaN(quantity)) {
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

    //if (input.pattern == "hexagon") quantity *= 6;
    console.log(guiOptions.generator.fixed);
    createParticlesList(newParticles, quantity,
        generateMass,
        generateCharge,
        generateNearCharge,
        generatePosition,
        generateVelocity,
        guiOptions.generator.fixed
    );

    selection = new SelectionHelper(graphics, guiOptions.selection, guiSelection);
    selection.source = SourceType.generated;
    selection.list = newParticles;
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

export function animate(time) {
    requestAnimationFrame(animate);

    graphics.update();
    stats.update();

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

        if (useGPU && guiOptions.particle.obj != undefined) graphics.readbackParticleData();
        guiInfoRefresh(time);
        guiParticleRefresh();
        selection.guiRefresh();
        guiParametersRefresh();

        if (updateField) {
            updateField = false;
            simulation.fieldSetup("update");
        }
    }

    if (!isNaN(time)) lastAnimateTime = time;
}