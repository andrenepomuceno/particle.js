import {
    simulation,
    core,
} from './core.js';
import { Mouse } from './components/mouse';
import { Keyboard } from './components/keyboard';
import { Selection } from './components/selection';
import { Ruler } from './components/ruler';

import Stats from './gui/stats';
import { GUIInfo } from './gui/info.js';
import { GUIParticle } from './gui/particle.js';
import { GUIParameters } from './gui/parameters.js';
import { GUIField } from './gui/field.js';
import { GUIGenerator } from './gui/generator.js';
import { GUISelection } from './gui/selection.js';
import { GUIControls } from './gui/controls.js';
import { GUIAdvanced } from './gui/advanced.js';
import { UI } from '../ui/App.jsx';
import { ParticleType } from './particle.js';

const viewUpdateDelay = 1000;
const simulationStepDelay = (1000.0/60.0);
let lastViewUpdate = 0;
let lastAnimateTime = 0;

const statsPanel = new Stats();
const velocityPanel = statsPanel.addPanel(new Stats.Panel('VEL'));
const computePanel = new Stats.Panel('GPU');
statsPanel.addPanel(computePanel);
//statsPanel.showPanel(0);

const mouse = new Mouse();

function log(msg) {
    let timestamp = new Date().toISOString();
    console.log(timestamp + " | View: " + msg);
}

const collapseList = [];
const guiOptions = {
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
guiOptions.ruler = new Ruler(simulation.graphics);
const selection = new Selection(simulation.graphics, guiOptions);
guiOptions.selectionHelper = selection;

function scenarioSetup(idx) {
    log('setup ' + idx);

    simulation.graphics.cleanup();
    velocityPanel.cleanup();
    computePanel.cleanup();
    statsPanel.fpsPanel.cleanup();

    guiOptions.guiInfo.reset();
    guiOptions.selectionHelper.clear();
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

export function viewSetup() {
    document.getElementById('renderer-container').appendChild(simulation.graphics.renderer.domElement);

    window.onresize = onWindowResize;
    document.addEventListener('keydown', e => guiOptions.keyboard.onKeyDown(guiOptions.keyboard, e));
    document.addEventListener('keyup', e => guiOptions.keyboard.onKeyUp(guiOptions.keyboard, e));

    window.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);

    guiOptions.selectionHelper.graphics = simulation.graphics;

    //stats overlay
    const rootDOM = document.getElementById('root');
    rootDOM.appendChild(statsPanel.domElement);

    // mouse.addOverListener(statsPanel.domElement);
    statsPanel.domElement.style.visibility = 'visible';

    //gui menu overlays
    // mouse.addOverListener(rootDOM);

    guiOptions.guiInfo = new GUIInfo(guiOptions);
    guiOptions.guiControls = new GUIControls(guiOptions);
    guiOptions.guiParticle = new GUIParticle(guiOptions);
    guiOptions.guiParameters = new GUIParameters(guiOptions);
    guiOptions.guiSelection = new GUISelection(guiOptions);
    guiOptions.guiGenerator = new GUIGenerator(guiOptions);
    guiOptions.guiAdvanced = new GUIAdvanced(guiOptions);
    guiOptions.guiField = new GUIField(guiOptions);

    scenarioSetup();

    simulation.graphics.controls.addEventListener('end', onFinishMove);

    guiOptions.keyboard = new Keyboard(mouse, guiOptions, simulation);
    guiOptions.ruler = new Ruler(simulation.graphics, guiOptions.info);

    // console.log(UI);

    log('Animating...');
    requestAnimationFrame(animate);
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
    if (guiOptions.field.automaticRefresh == true) guiOptions.field.needResize = true;
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
                if (particle.type != ParticleType.default && particle.type != ParticleType.fixed) return;
                guiOptions.particle.obj = particle;
                guiOptions.guiParticle.refresh();
                
                UI.particle.setOpen(true);
            }
        });
    } else if (event.button == 1) {
        //middle 
        simulation.graphics.controls.zoomSpeed = 1.0;
    }
}

function onFinishMove(event) {
    log('onFinishMove');
    if (guiOptions.field.automaticRefresh == true) guiOptions.field.needResize = true;
}

function animate(time) {
    requestAnimationFrame(animate);

    /*if (isNaN(time)) {
        return;
    }*/

    const dt = time - lastAnimateTime;
    if (dt < simulationStepDelay) {
        return;
    }
    lastAnimateTime = time;

    if (!guiOptions.controls.pause || guiOptions.nextFrame) {
        if (guiOptions.field.needResize) {
            guiOptions.field.needResize = false;
            guiOptions.field.fieldResize();
        }

        simulation.step(dt, time);

        if (guiOptions.particle.followParticle && guiOptions.particle.obj) {
            let x = guiOptions.particle.obj.position;
            cameraTargetSet(x);
        }

        guiOptions.nextFrame = false;
    }

    if (time - lastViewUpdate >= viewUpdateDelay) {
        new Promise(() => {
            lastViewUpdate = time;

            if (guiOptions.info.autoRefresh == true) {
                simulation.graphics.readbackParticleData();
            }

            guiOptions.guiInfo.refresh();
            guiOptions.guiParticle.refresh();
            guiOptions.guiSelection.refresh();
            guiOptions.guiParameters.refresh();
            guiOptions.guiControls.refresh();
            guiOptions.guiField.refresh();
            guiOptions.guiGenerator.refresh();
        });
    }

    simulation.graphics.render();
    statsPanel.update();
}