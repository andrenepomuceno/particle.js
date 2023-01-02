import {
    simulation,
    core,
} from './core.js';
import { Mouse } from './components/mouse';
import { Keyboard } from './components/keyboard';
import { Selection } from './components/selection';
import { Ruler } from './components/ruler';

import Stats from './gui/stats';
import * as dat from './gui/dat.gui';
import { GUIInfo } from './gui/info.js';
import { GUIParticle } from './gui/particle.js';
import { guiParametersSetup, guiParametersRefresh } from './gui/parameters.js';
import { GUIField } from './gui/field.js';
import { GUIGenerator } from './gui/generator.js';
import { guiSelectionSetup } from './gui/selection.js';
import { GUIControls } from './gui/controls.js';
import { GUIAdvanced } from './gui/advanced.js';

const viewUpdateDelay = 1000;
let lastViewUpdate = 0;
let lastAnimateTime = 0;

const statsPanel = new Stats();
const velocityPanel = statsPanel.addPanel(new Stats.Panel('VEL'));
const computePanel = statsPanel.addPanel(new Stats.Panel('GPU'));
//statsPanel.showPanel(0);

const gui = new dat.GUI();
const guiInfo = gui.addFolder("INFORMATION");
const guiControls = gui.addFolder("CONTROLS (keyboard and mouse shortcuts)");
const guiParticle = gui.addFolder("PARTICLE (click on particle or enter ID)");
const guiSelection = gui.addFolder("SELECTION");
const guiGenerator = gui.addFolder("GENERATOR");
const guiField = gui.addFolder("FIELD");
const guiAdvanced = gui.addFolder("ADVANCED");
const guiParameters = gui.addFolder("PARAMETERS");

const mouse = new Mouse();
const selection = new Selection();

function log(msg) {
    console.log("View: " + msg);
}

let collapseList = [];
let guiOptions = {
    scenarioSetup,
    showCursor,
    cameraTargetSet,

    nextFrame: false,
    statsPanel,
    velocityPanel,
    computePanel,
    mouseHelper: mouse,
    selectionHelper: selection,
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

guiOptions.keyboard = new Keyboard(mouse, guiOptions);
guiOptions.ruler = new Ruler(simulation.graphics, guiOptions.controls);

function scenarioSetup(idx) {
    log("setup " + idx);

    velocityPanel.cleanup();
    computePanel.cleanup();

    guiOptions.guiInfo.reset();
    guiOptions.selectionHelper.clear();
    guiOptions.particle.close();
    guiOptions.generator.default();
    simulation.graphics.controls.autoRotate = false;

    core.setup(idx);

    if (guiOptions.controls.showCursor == true) {
        showCursor();
    }
    simulation.graphics.showAxis(guiOptions.controls.showAxis, simulation.mode2D);

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
    mouse.addListener(statsPanel.domElement);
    statsPanel.domElement.style.visibility = "visible";

    //gui menu overlay
    mouse.addListener(gui.domElement);
    gui.width = Math.max(0.2 * window.innerWidth, 320);

    guiOptions.guiInfo = new GUIInfo(guiOptions, guiInfo);
    guiOptions.guiInfo.setup();
    guiOptions.guiControls = new GUIControls(guiOptions, guiControls);
    guiOptions.guiControls.setup();
    guiOptions.guiParticle = new GUIParticle(guiOptions, guiParticle);
    guiOptions.guiParticle.setup();
    guiParametersSetup(guiOptions, guiParameters);
    guiSelectionSetup(guiOptions, guiSelection);
    guiOptions.guiGenerator = new GUIGenerator(guiOptions, guiGenerator, guiSelection);
    guiOptions.guiGenerator.setup();
    guiOptions.guiAdvancedControls = new GUIAdvanced(guiOptions, guiAdvanced);
    guiOptions.guiAdvancedControls.setup();
    guiOptions.guiField = new GUIField(guiOptions, guiField);
    guiOptions.guiField.setup();

    scenarioSetup();

    simulation.graphics.controls.addEventListener('end', onFinishMove);

    guiOptions.keyboard = new Keyboard(mouse, guiOptions, simulation);
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
    let radius = Math.max(2 * simulation.particleRadius, 1e-3);
    let thick = Math.max(0.1 * radius, 1e-4);
    mouse.showCursor(simulation.graphics, radius, thick);
}

/* CALLBACKS */

function onWindowResize() {
    log("window.onresize " + window.innerWidth + "x" + window.innerHeight);
    simulation.graphics.onWindowResize(window);
    if (guiOptions.field.automaticRefresh == true) guiOptions.field.fieldResize();
}

function onPointerMove(event) {
    mouse.move(event);
    if (selection.started) {
        selection.update(event);
        guiOptions.ruler.update(event);
    }
}

function onPointerDown(event) {
    if (event.button == 0 && event.shiftKey) {
        //selection = new Selection(simulation.graphics, guiOptions.selection, guiSelection);
        selection.clear();
        selection.graphics = simulation.graphics;
        selection.options = guiOptions.selection;
        selection.guiSelection = guiSelection;

        selection.start(event);
        guiOptions.ruler.start(simulation.graphics, event);
    }
}

function onPointerUp(event) {
    if (event.button == 0 && selection.started) {
        selection.end(event, guiOptions.ruler.mode);
        guiOptions.ruler.finish(event);
    } else if (event.button == 0 && !mouse.overGUI) {
        let particle = simulation.graphics.raycast(core, mouse.position);
        if (particle) {
            guiOptions.particle.obj = particle;
            guiOptions.guiParticle.refresh();
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
        guiOptions.guiParticle.refresh();
        selection.guiRefresh();
        guiParametersRefresh();
        guiOptions.guiControls.refresh();
    }

    if (!isNaN(time)) lastAnimateTime = time;
}