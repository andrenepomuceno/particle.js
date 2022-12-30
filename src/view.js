import * as dat from 'dat.gui';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import {
    simulation,
    core,
} from './core.js';
import { MouseHelper } from './components/mouseHelper';
import { KeyboardHelper } from './components/keyboardHelper.js';
import { SelectionHelper } from './components/selectionHelper.js';
import { Ruler } from './components/ruler';

import { guiInfoSetup, guiInfoRefresh, autoRefresh } from './gui/info.js';
import { guiParticleSetup, guiParticleRefresh } from './gui/particle.js';
import { guiParametersSetup, guiParametersRefresh } from './gui/parameters.js';
import { guiFieldSetup, guiFieldRefresh } from './gui/field.js';
import { guiGeneratorSetup } from './gui/generator.js';
import { guiSelectionSetup } from './gui/selection.js';
import { guiControlsSetup, guiControlsRefresh } from './gui/controls.js';
import { guiAdvancedControlsSetup } from './gui/advancedControls.js';

const viewUpdateDelay = 1000;
let lastViewUpdate = 0;
let lastAnimateTime = 0;

const statsPanel = new Stats();
const energyPanel = statsPanel.addPanel(new Stats.Panel('V', '#ff8', '#221'));

const gui = new dat.GUI();
const guiInfo = gui.addFolder("INFORMATION");
const guiControls = gui.addFolder("CONTROLS (keyboard and mouse shortcuts)");
const guiParticle = gui.addFolder("PARTICLE (click on particle or enter ID)");
const guiSelection = gui.addFolder("SELECTION");
const guiGenerator = gui.addFolder("GENERATOR");
const guiField = gui.addFolder("FIELD");
const guiAdvancedControls = gui.addFolder("ADVANCED");
const guiParameters = gui.addFolder("PARAMETERS");

const mouseHelper = new MouseHelper();
const selectionHelper = new SelectionHelper();

function log(msg) {
    console.log("View: " + msg);
}

let collapseList = [];
let guiOptions = {
    scenarioSetup: (idx) => {
        scenarioSetup(idx);
    },
    showCursor: () => {
        showCursor();
    },
    cameraTargetSet: (pos) => {
        cameraTargetSet(pos);
    },

    nextFrame: false,
    statsPanel,
    energyPanel,
    gui,
    mouseHelper,
    selectionHelper,
    ruler: undefined,
    keyboard: undefined,
    collapseList,

    info: {},
    controls: {},
    particle: {},
    selection: {},
    generator: {},
    parameters: {},
    advancedControls: {},
    field: {},
}

guiOptions.keyboard = new KeyboardHelper(mouseHelper, guiOptions);
guiOptions.ruler = new Ruler(simulation.graphics, guiOptions.controls);

function scenarioSetup(idx) {
    log("setup " + idx);
    guiOptions.selectionHelper.clear();
    guiOptions.particle.close();

    core.setup(idx);

    guiParametersRefresh();
    guiControlsRefresh();
    guiInfoRefresh();
    guiOptions.generator.default();
    guiFieldRefresh();

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
    document.addEventListener("keydown", e => guiOptions.keyboard.onKeyDown(guiOptions.keyboard, e));
    document.addEventListener("keyup", e => guiOptions.keyboard.onKeyUp(guiOptions.keyboard, e));

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

    guiInfoSetup(guiOptions, guiInfo);
    guiControlsSetup(guiOptions, guiControls);
    guiParticleSetup(guiOptions, guiParticle);
    guiParametersSetup(guiOptions, guiParameters);
    guiSelectionSetup(guiOptions, guiSelection);
    guiGeneratorSetup(guiOptions, guiGenerator, guiSelection);
    guiAdvancedControlsSetup(guiOptions, guiAdvancedControls);
    guiFieldSetup(guiOptions, guiField);

    scenarioSetup();

    simulation.graphics.controls.addEventListener('end', onFinishMove);

    guiOptions.keyboard = new KeyboardHelper(mouseHelper, guiOptions, simulation);
    guiOptions.ruler = new Ruler(simulation.graphics, guiOptions.info);

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
    if (selectionHelper.started) {
        selectionHelper.update(event);
        guiOptions.ruler.update(event);
    }
}

function onPointerDown(event) {
    if (event.button == 0 && event.shiftKey) {
        //selection = new SelectionHelper(simulation.graphics, guiOptions.selection, guiSelection);
        selectionHelper.clear();
        selectionHelper.graphics = simulation.graphics;
        selectionHelper.options = guiOptions.selection;
        selectionHelper.guiSelection = guiSelection;

        selectionHelper.start(event);
        guiOptions.ruler.start(simulation.graphics, event);
    }
}

function onPointerUp(event) {
    if (event.button == 0 && selectionHelper.started) {
        selectionHelper.end(event, guiOptions.ruler.mode);
        guiOptions.ruler.finish(event);
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

        guiInfoRefresh();
        guiParticleRefresh();
        selectionHelper.guiRefresh();
        guiParametersRefresh();
        guiControlsRefresh();
    }

    if (!isNaN(time)) lastAnimateTime = time;
}