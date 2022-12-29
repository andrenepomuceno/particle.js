import * as dat from 'dat.gui';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import {
    simulation,
    core,
} from './core.js';
import { MouseHelper } from './components/mouseHelper';
import { Keyboard } from './components/keyboard.js';
import { SelectionHelper } from './components/selectionHelper.js';
import { Ruler } from './components/ruler';

import { guiInfoSetup, guiInfoRefresh, autoRefresh } from './menu/info.js';
import { guiParticleSetup, guiParticleRefresh } from './menu/particle.js';
import { guiParametersSetup, guiParametersRefresh } from './menu/parameters.js';
import { guiFieldSetup, guiFieldRefresh } from './menu/field.js';
import { guiGeneratorSetup } from './menu/generator.js';
import { guiSelectionSetup } from './menu/selection.js';
import { guiControlsSetup } from './menu/controls.js';
import { guiAdvancedControlsSetup } from './menu/advancedControls.js';

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
    nextFrame: false,
    statsPanel,
    energyPanel,
    gui,

    scenarioSetup: (idx) => {
        scenarioSetup(idx);
    },
    showCursor: () => {
        showCursor();
    },
    cameraTargetSet: (pos) => {
        cameraTargetSet(pos);
    },

    info: {},
    controls: {},
    particle: {},
    selection: {},
    generator: {},
    parameters: {},
    advancedControls: {},
    field: {},
}

const mouseHelper = new MouseHelper();
const selection = new SelectionHelper();
let keyboard = new Keyboard(mouseHelper, guiOptions);
let ruler = new Ruler(simulation.graphics, guiOptions.controls);

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
    console.log(guiOptions);
    console.log(guiControls);
    console.log(collapseList);
    guiControlsSetup(guiOptions, guiControls, collapseList, mouseHelper);
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

/* HELPERS */

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

    if (!guiOptions.controls.pause || guiOptions.nextFrame) {
        guiOptions.nextFrame = false;

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