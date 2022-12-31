import {
    simulation,
    core,
} from './core.js';
import { MouseHelper } from './components/mouseHelper';
import { KeyboardHelper } from './components/keyboardHelper.js';
import { SelectionHelper } from './components/selectionHelper.js';
import { Ruler } from './components/ruler';

import Stats from './gui/stats';
import * as dat from './gui/dat.gui';
import { GUIInfo } from './gui/info.js';
import { guiParticleSetup, guiParticleRefresh } from './gui/particle.js';
import { guiParametersSetup, guiParametersRefresh } from './gui/parameters.js';
import { GUIField } from './gui/field.js';
import { GUIGenerator } from './gui/generator.js';
import { guiSelectionSetup } from './gui/selection.js';
import { GUIControls } from './gui/controls.js';
import { GUIAdvancedControls } from './gui/advancedControls.js';

const viewUpdateDelay = 1000;
let lastViewUpdate = 0;
let lastAnimateTime = 0;

const statsPanel = new Stats();
const velocityPanel = statsPanel.addPanel(new Stats.Panel('VEL'));
const computePanel = statsPanel.addPanel(new Stats.Panel('GPU'));
statsPanel.showPanel(0);

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
    velocityPanel,
    computePanel,
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

    gui,
    guiControls: undefined,
    guiAdvancedControls: undefined,
}

guiOptions.keyboard = new KeyboardHelper(mouseHelper, guiOptions);
guiOptions.ruler = new Ruler(simulation.graphics, guiOptions.controls);

function scenarioSetup(idx) {
    log("setup " + idx);

    guiOptions.selectionHelper.clear();
    guiOptions.particle.close();

    velocityPanel.cleanup();
    computePanel.cleanup();
    guiOptions.guiInfo.reset();
    guiOptions.generator.default();
    guiOptions.advancedControls.automaticRotation = false;
    simulation.graphics.controls.autoRotate = false;
    if (guiOptions.controls.showCursor == true) {
        showCursor();
    }

    core.setup(idx);

    guiOptions.guiInfo.refresh();
    guiOptions.guiControls.refresh();
    guiParametersRefresh();
    guiOptions.guiField.refresh();
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

    guiOptions.guiInfo = new GUIInfo(guiOptions, guiInfo);
    guiOptions.guiInfo.setup();
    guiOptions.guiControls = new GUIControls(guiOptions, guiControls);
    guiOptions.guiControls.setup();
    guiParticleSetup(guiOptions, guiParticle);
    guiParametersSetup(guiOptions, guiParameters);
    guiSelectionSetup(guiOptions, guiSelection);
    guiOptions.guiGenerator = new GUIGenerator(guiOptions, guiGenerator, guiSelection);
    guiOptions.guiGenerator.setup();
    guiOptions.guiAdvancedControls = new GUIAdvancedControls(guiOptions, guiAdvancedControls);
    guiOptions.guiAdvancedControls.setup();
    guiOptions.guiField = new GUIField(guiOptions, guiField);
    guiOptions.guiField.setup();

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
        let particle = simulation.graphics.raycast(core, mouseHelper.position);
        if (particle) {
            guiOptions.particle.obj = particle;
            guiParticleRefresh();
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

        if (guiOptions.info.autoRefresh == true) {
            simulation.graphics.readbackParticleData();
        }

        guiOptions.guiInfo.refresh();
        guiParticleRefresh();
        selectionHelper.guiRefresh();
        guiParametersRefresh();
        guiOptions.guiControls.refresh();
    }

    if (!isNaN(time)) lastAnimateTime = time;
}