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
    simulation,
    core,
} from './core.js';
import { scenariosList } from './scenarios.js';
import { randomSphericVector } from './helpers.js';
import { exportCSV, uploadCsv } from './components/csv';
import { MouseHelper } from './components/mouseHelper';
import { Keyboard } from './components/keyboard.js';
import { SelectionHelper, SourceType } from './components/selectionHelper.js';
import { Ruler } from './components/ruler';
import { createParticle, randomVector } from './scenariosHelpers.js';

import { guiInfoSetup, guiInfoRefresh, autoRefresh } from './menu/info.js';
import { guiParticleSetup, guiParticleRefresh } from './menu/particle.js';
import { guiParametersSetup, guiParametersRefresh } from './menu/parameters.js';
import { guiFieldSetup, guiFieldRefresh } from './menu/field.js';
import { guiGeneratorSetup } from './menu/generator.js';
import { guiSelectionSetup } from './menu/selection.js';

let hideAxis = false;
let colorMode = "charge";
let hideOverlay = false;
let nextFrame = false;
let pause = false;
const viewUpdateDelay = 1000;
let lastViewUpdate = 0;
let lastAnimateTime = 0;

let statsPanel = new Stats();
let energyPanel = statsPanel.addPanel(new Stats.Panel('V', '#ff8', '#221'));

const gui = new dat.GUI();
const guiInfo = gui.addFolder("INFORMATION");
const guiControls = gui.addFolder("CONTROLS (keyboard and mouse shortcuts)");
const guiParticle = gui.addFolder("PARTICLE (click on particle or enter ID)");
const guiSelection = gui.addFolder("SELECTION");
const guiGenerator = gui.addFolder("GENERATOR");
const guiField = gui.addFolder("FIELD");
const guiAdvancedControls = gui.addFolder("ADVANCED");
const guiParameters = gui.addFolder("PARAMETERS");

function log(msg) {
    console.log("View: " + msg);
}

let collapseList = [];
let guiOptions = {
    scenarioSetup: (idx) => {
        scenarioSetup(idx);
    },
    info: {},
    controls: {
        pauseResume: function () {
            pause = !pause;
        },
        step: function () {
            nextFrame = true;
        },
        reset: function () {
            scenarioSetup();
        },
        next: function () {
            if (core.simulationIdx < scenariosList.length - 1)
                scenarioSetup(++core.simulationIdx);
        },
        previous: function () {
            if (core.simulationIdx > 0)
                scenarioSetup(--core.simulationIdx);
        },
        snapshot: function () {
            snapshot();
        },
        import: function () {
            uploadCsv((name, content) => {
                guiOptions.particle.close();
                core.importCSV(name, content);
                guiInfoRefresh(guiOptions, energyPanel);
                guiParametersRefresh(guiOptions);
            });
        },
        hideAxis: function () {
            hideAxis = !hideAxis;
            simulation.graphics.showAxis(!hideAxis);
        },
        resetCamera: function () {
            guiOptions.particle.followParticle = false;
            simulation.graphics.controls.reset();
        },
        xyCamera: function () {
            guiOptions.particle.followParticle = false;
            cameraTargetSet(simulation.graphics.controls.target);
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
            core.simulationIdx = 0;
            scenarioSetup(core.simulationIdx);
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
                core.deleteAll();
            }
        },
        sandbox: () => {
            core.simulationIdx = core.scenariosList.length - 1;
            scenarioSetup(core.simulationIdx);
        },
        hideOverlay: () => {
            if (hideOverlay == false) {
                statsPanel.domElement.style.visibility = "hidden";
                gui.hide();
                mouseHelper.overGUI = false;
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
        record: () => {
            simulation.graphics.capture(simulation.name);
        },
        debug: () => {
            console.log(exportCSV(simulation));
        },
        showCursor: true,
    },
    particle: {},
    selection: {},
    generator: {},
    parameters: {},
    advancedControls: {
        dampKickFactor: "0.1",
        randomVelocity: "10",
        cleanupThreshold: "8",
        automaticRotation: false,
        rotationSpeed: simulation.graphics.controls.autoRotateSpeed.toString(),
        shader3d: true,
        reverseVelocity: () => {
            simulation.graphics.readbackParticleData();
            simulation.graphics.particleList.forEach((p) => {
                p.velocity.multiplyScalar(-1);
            });
            simulation.drawParticles();
        },
        zeroVelocity: () => {
            simulation.graphics.readbackParticleData();
            simulation.graphics.particleList.forEach((p) => {
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
            core.particleAutoCleanup(thresh);
        },
        dampVelocity: () => {
            let factor = parseFloat(guiOptions.advancedControls.dampKickFactor);
            simulation.graphics.readbackParticleData();
            simulation.graphics.particleList.forEach((p) => {
                p.velocity.multiplyScalar(1.0 - factor);
            });
            simulation.drawParticles();
        },
        kickVelocity: () => {
            let factor = parseFloat(guiOptions.advancedControls.dampKickFactor);
            simulation.graphics.readbackParticleData();
            simulation.graphics.particleList.forEach((p) => {
                p.velocity.multiplyScalar(1.0 + factor);
            });
            simulation.drawParticles();
        },
        addRandomVelocity: () => {
            simulation.graphics.readbackParticleData();
            simulation.graphics.particleList.forEach((p) => {
                let e = parseFloat(guiOptions.advancedControls.randomVelocity);
                if (isNaN(e)) return;
                p.velocity.add(randomSphericVector(0, e, simulation.mode2D));
            });
            simulation.drawParticles();
        },
        zeroPosition: () => {
            simulation.graphics.readbackParticleData();
            simulation.graphics.particleList.forEach((p) => {
                p.position = randomSphericVector(0, 1, simulation.mode2D);
            });
            simulation.drawParticles();
        },
        close: () => {
            guiAdvancedControls.close();
        },
    },
    field: {},
}

const mouseHelper = new MouseHelper();
let selection = new SelectionHelper();
let keyboard = undefined;
let ruler = undefined;

function scenarioSetup(idx) {
    log("setup " + idx);
    guiOptions.selection.clear();
    guiOptions.particle.close();

    core.setup(idx);

    guiParametersRefresh(guiOptions);
    guiInfoRefresh(guiOptions, energyPanel);
    guiOptions.generator.default();
    guiFieldRefresh(guiOptions);

    energyPanel.min = 0;
    energyPanel.max = 0;

    guiOptions.advancedControls.automaticRotation = false;
    simulation.graphics.controls.autoRotate = false;

    if (guiOptions.controls.showCursor == true) {
        showCursor();
    }
}

export function viewSetup() {
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

    guiInfoSetup(guiOptions, guiInfo, collapseList);
    guiControlsSetup(guiOptions, guiControls, collapseList);
    guiParticleSetup(guiOptions, guiParticle, collapseList);
    guiParametersSetup(guiOptions, guiParameters, collapseList);
    guiSelectionSetup(guiOptions, guiSelection, collapseList, selection, mouseHelper);
    guiGeneratorSetup(guiOptions, guiGenerator, collapseList, mouseHelper, guiSelection, selection);
    guiAdvancedControlsSetup(guiOptions, guiAdvancedControls, collapseList);
    guiFieldSetup(guiOptions, guiField, collapseList);

    scenarioSetup();

    simulation.graphics.controls.addEventListener('end', onFinishMove);

    keyboard = new Keyboard(mouseHelper, guiOptions, simulation);
    ruler = new Ruler(simulation.graphics, guiOptions.info);

    animate();
}

function guiControlsSetup(guiOptions, guiControls, collapseList) {
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
    guiControlsCamera.add(guiOptions.advancedControls, 'automaticRotation').name("Automatic Rotation").listen().onFinishChange(val => {
        if (val == true) {
            if (simulation.mode2D == true) {
                alert('Cannot do this in 2D mode.');
                guiOptions.advancedControls.automaticRotation = false;
                simulation.graphics.controls.autoRotate = false;
                return;
            }
            simulation.graphics.controls.autoRotate = true;
            simulation.graphics.controls.autoRotateSpeed = 1.0;
        } else {
            simulation.graphics.controls.autoRotate = false;
        }
    });
    guiControlsCamera.add(guiOptions.advancedControls, 'rotationSpeed').name("Rotation Speed").listen().onFinishChange(val => {
        val = parseFloat(val);
        if (isNaN(val)) {
            alert('Invalid value.');
            guiOptions.advancedControls.rotationSpeed = simulation.graphics.controls.autoRotateSpeed;
            return;
        }
        simulation.graphics.controls.autoRotateSpeed = val;
    });

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
    guiControlsView.add(guiOptions.advancedControls, 'shader3d').name("3D Shader").listen().onFinishChange(val => {
        if (val == true) {
            simulation.graphics.arrow3d = true;
            simulation.graphics.particle3d = true;
        } else {
            simulation.graphics.arrow3d = false;
            simulation.graphics.particle3d = false;
        }
        simulation.graphics.readbackParticleData();
        simulation.drawParticles();
    });

    guiControls.add(guiOptions.controls, 'sandbox').name("Sandbox Mode [S]");
    guiControls.add(guiOptions.controls, 'snapshot').name("Export simulation [P]");
    guiControls.add(guiOptions.controls, 'import').name("Import simulation [I]");
    guiControls.add(guiOptions.controls, 'deleteAll').name("Delete all particles [DEL]");

    guiControls.add(guiOptions.controls, 'close').name("Close");

    collapseList.push(guiControls);
    collapseList.push(guiControlsCamera);
    collapseList.push(guiControlsSimulation);
    collapseList.push(guiControlsView);
}

function guiAdvancedControlsSetup(guiOptions, guiAdvancedControls, collapseList) {
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
    guiAdvancedControls.add(guiOptions.advancedControls, 'close').name("Close");

    collapseList.push(guiAdvancedControls);
}

/* HELPERS */

function snapshot() {
    let name = simulation.state()[0];
    let finalName = exportFilename(name)
    log("snapshot " + finalName);

    simulation.graphics.update();
    simulation.graphics.renderer.domElement.toBlob((blob) => {
        downloadFile(blob, finalName + ".png", "image/png");
    }, 'image/png', 1);
    downloadFile(exportCSV(simulation), finalName + ".csv", "text/plain;charset=utf-8");
}

function cameraTargetSet(pos) {
    log('cameraTargetSet');
    simulation.graphics.camera.position.set(pos.x, pos.y, simulation.graphics.controls.getDistance());
    simulation.graphics.controls.target.set(pos.x, pos.y, pos.z);
    simulation.graphics.controls.update();
}

function showCursor() {
    guiOptions.controls.showCursor = true;
    let radius = Math.max(2 * simulation.particleRadius, 10);
    let thick = Math.max(0.1 * radius, 1);
    mouseHelper.showCursor(simulation.graphics, radius, thick);
}

/* CALLBACKS */

function onWindowResize() {
    log("window.onresize " + window.innerWidth + "x" + window.innerHeight);
    simulation.graphics.onWindowResize(window);
    if (guiOptions.field.automaticRefresh == true) guiOptions.field.fieldResize();
}

function onPointerMove(event) {
    mouseHelper.move(event);
    if (selection.started) {
        selection.update(event);
        ruler.update(event);
    }
}

function onPointerDown(event) {
    if (event.button == 0 && event.shiftKey) {
        //selection = new SelectionHelper(simulation.graphics, guiOptions.selection, guiSelection);
        selection.clear();
        selection.graphics = simulation.graphics;
        selection.options = guiOptions.selection;
        selection.guiSelection = guiSelection;

        selection.start(event);
        ruler.start(simulation.graphics, event);
    }
}

function onPointerUp(event) {
    if (event.button == 0 && selection.started) {
        selection.end(event, ruler.mode);
        ruler.finish(event);
    } else if (event.button == 0 && !mouseHelper.overGUI) {
        let particle = simulation.graphics.raycast(mouseHelper.position);
        if (particle) {
            guiOptions.particle.obj = particle;
            guiParticle.open();
        }
    }
}

function onFinishMove(event) {
    log('onFinishMove');
    if (guiOptions.field.automaticRefresh == true) guiOptions.field.fieldResize();
}

function animate(time) {
    requestAnimationFrame(animate);

    simulation.graphics.update();
    statsPanel.update();

    if (guiOptions.particle.followParticle && guiOptions.particle.obj) {
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

        if (autoRefresh == true) {
            simulation.graphics.readbackParticleData();
        }

        guiInfoRefresh(guiOptions, energyPanel);
        guiParticleRefresh(guiOptions);
        selection.guiRefresh();
        guiParametersRefresh(guiOptions);
    }

    if (!isNaN(time)) lastAnimateTime = time;
}