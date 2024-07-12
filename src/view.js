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
import { GUIParameters } from './gui/parameters.js';
import { GUIField } from './gui/field.js';
import { GUIGenerator } from './gui/generator.js';
import { GUISelection } from './gui/selection.js';
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
const guiInfo = gui.addFolder('INFORMATION');
const guiControls = gui.addFolder("CONTROLS (keyboard and mouse shortcuts)");
const guiParticle = gui.addFolder("PARTICLE (click on particle or enter ID)");
const guiSelection = gui.addFolder('SELECTION');
const guiGenerator = gui.addFolder('GENERATOR');
const guiField = gui.addFolder('FIELD');
const guiAdvanced = gui.addFolder('ADVANCED');
const guiParameters = gui.addFolder('PARAMETERS');

const mouse = new Mouse();

function log(msg) {
    let timestamp = new Date().toISOString();
    console.log(timestamp + " | View: " + msg);
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
    selectionHelper: undefined,
    ruler: undefined,
    keyboard: undefined,
    collapseList,

    gui,
    guiInfo: undefined,
    guiControls: undefined,
    guiSelection: undefined,
    guiGenerator: undefined,
    guiField: undefined,
    guiAdvanced: undefined,
    guiParameters: undefined,

    info: {},
    controls: {},
    particle: {},
    selection: {},
    generator: {},
    parameters: {},
    advanced: {},
    field: {},
}

guiOptions.keyboard = new Keyboard(mouse, guiOptions);
guiOptions.ruler = new Ruler(simulation.graphics, guiOptions.controls);
const selection = new Selection(simulation.graphics, guiSelection, guiOptions);
guiOptions.selectionHelper = selection;

function scenarioSetup(idx) {
    log('setup ' + idx);

    simulation.graphics.cleanup();
    velocityPanel.cleanup();
    computePanel.cleanup();
    statsPanel.fpsPanel.cleanup();

    guiOptions.guiInfo.reset();
    guiOptions.selectionHelper.clear();
    guiOptions.particle.close();
    guiOptions.generator.default();
    simulation.graphics.controls.autoRotate = false;

    core.setup(idx);

    simulation.graphics.showAxis(guiOptions.controls.showAxis, simulation.mode2D, simulation.graphics.axisWidth);
    if (guiOptions.controls.showCursor == true) {
        showCursor();
    }

    guiOptions.guiInfo.refresh();
    guiOptions.guiControls.refresh();
    guiOptions.guiParameters.refresh();
    guiOptions.guiField.refresh();

    log('setup done');
}

function showFirstTimeInstructionsPopup() {
    // Check if the user has already seen the popup
    if (localStorage.getItem('hasSeenInstructionsPopup')) {
        return;
    }

    localStorage.setItem('hasSeenInstructionsPopup', 'true');

    guiOptions.controls.showHelp();
}

export function viewSetup() {
    window.onresize = onWindowResize;
    document.addEventListener('keydown', e => guiOptions.keyboard.onKeyDown(guiOptions.keyboard, e));
    document.addEventListener('keyup', e => guiOptions.keyboard.onKeyUp(guiOptions.keyboard, e));

    window.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);

    guiOptions.selectionHelper.graphics = simulation.graphics;

    //stats overlay
    document.getElementById('container').appendChild(statsPanel.domElement);
    mouse.addOverListener(statsPanel.domElement);
    statsPanel.domElement.style.visibility = 'visible';

    //gui menu overlay
    mouse.addOverListener(gui.domElement);
    gui.width = Math.max(0.2 * window.innerWidth, 420);

    guiOptions.guiInfo = new GUIInfo(guiOptions, guiInfo);
    guiOptions.guiControls = new GUIControls(guiOptions, guiControls);
    guiOptions.guiParticle = new GUIParticle(guiOptions, guiParticle);
    guiOptions.guiParameters = new GUIParameters(guiOptions, guiParameters);
    guiOptions.guiSelection = new GUISelection(guiOptions, guiSelection);
    guiOptions.guiGenerator = new GUIGenerator(guiOptions, guiGenerator);
    guiOptions.guiAdvanced = new GUIAdvanced(guiOptions, guiAdvanced);
    guiOptions.guiField = new GUIField(guiOptions, guiField);

    scenarioSetup();

    simulation.graphics.controls.addEventListener('end', onFinishMove);

    guiOptions.keyboard = new Keyboard(mouse, guiOptions, simulation);
    guiOptions.ruler = new Ruler(simulation.graphics, guiOptions.info);

    log('Animating...');
    animate();

    showFirstTimeInstructionsPopup();
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
    log('window.onresize ' + window.innerWidth + 'x' + window.innerHeight);
    simulation.graphics.onWindowResize(window);
    if (guiOptions.field.automaticRefresh == true) guiOptions.field.fieldResize();
}

function onPointerMove(event) {
    mouse.move(event);
    if (guiOptions.selectionHelper.started) {
        guiOptions.selectionHelper.update(event);
        guiOptions.ruler.update(event);
    }
}

function onPointerDown(event) {
    if (event.button == 0 && event.shiftKey) {
        selection.clear();
        selection.start(event);
        guiOptions.ruler.start(simulation.graphics, event);
    } else if (event.button == 1) {
        //middle 
        simulation.graphics.controls.zoomSpeed = 16.0;
    }
}

function onPointerUp(event) {
    if (event.button == 0 && guiOptions.selectionHelper.started) {
        guiOptions.selectionHelper.end(event, guiOptions.ruler.mode);
        guiOptions.ruler.finish(event);
    } else if (event.button == 0 && !mouse.overGUI) {
        new Promise(() => {
            let particle = simulation.graphics.raycast(core, mouse.position);
            if (particle) {
                guiOptions.particle.obj = particle;
                guiOptions.guiParticle.refresh();
                guiParticle.open();
            }
        });
    } else if (event.button == 1) {
        //middle 
        simulation.graphics.controls.zoomSpeed = 1.0;
    }
}

function onFinishMove(event) {
    log('onFinishMove');
    if (guiOptions.field.automaticRefresh == true) guiOptions.field.fieldResize();
}

function animate(time) {
    requestAnimationFrame(animate);

    simulation.graphics.render();
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
        new Promise(() => {
            lastViewUpdate = time;

            if (guiOptions.info.autoRefresh == true) {
                simulation.graphics.readbackParticleData();
            }

            guiOptions.guiInfo.refresh();
            guiOptions.guiParticle.refresh();
            guiOptions.selectionHelper.guiRefresh();
            guiOptions.guiParameters.refresh();
            guiOptions.guiControls.refresh();
        });
    }

    if (!isNaN(time)) lastAnimateTime = time;
}