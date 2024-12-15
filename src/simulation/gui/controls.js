import {
    downloadFile, generateExportFilename, uploadFile, downloadStringToZip, uploadJsonZip
} from '../helpers.js';
import {
    simulation,
    core,
} from '../core.js';
import { scenariosList } from '../scenarios.js';
import { UI } from '../../ui/App';

function log(msg) {
    console.log("menu/controls: " + msg);
}

let colorMode = 'charge';
let hideOverlay = false;
let options;
let controls;
let refreshCallbackList = [];

function translateFolder(folder) {
    const regex = /[a-z]+/i;
    const result = regex.exec(folder.name)[0];
    const map = {
        'CONTROLS': 'controls',
        'Simulation': 'simulation',
        'Camera': 'camera',
        'View': 'view',
    }
    return map[result];
}

function addMenuControl(
    folder, title, variable,
    // defaultValue = '',
    // refreshCallback = undefined,
    // variableList = undefined,
    onFinishChange = undefined,
) {
    //options.controls[variable] = defaultValue;
    // const onFinish = (val) => {
    //     core.updatePhysics(variable, val);
    // };
    
    const defaultValue = options.controls[variable];
    const refreshCallback = undefined;
    const variableList = undefined;

    if (onFinishChange == undefined) {
        folder.add(options.controls, variable).name(title);
    }
    else {
        folder.add(options.controls, variable, variableList).name(title).listen().onFinishChange(onFinishChange);
    }
    
    if (refreshCallback != undefined) {
        refreshCallbackList.push(refreshCallback);
    }

    const item = {
        title: title,
        value: defaultValue,
        onFinish: onFinishChange,
        selectionList: variableList,
        folder: translateFolder(folder)
    }
    UI.addItem(UI.controls, item);

    if (typeof defaultValue != 'function') {
        refreshCallbackList.push(() => {
            item.value = options.controls[variable];
        });
    }
}

export class GUIControls {
    constructor(guiOptions, guiControls) {
        options = guiOptions;
        controls = guiControls;
        this.setup();
    }

    setup() {
        options.controls = {
            showAxis: true,
            pause: false,
            automaticRotation: false,
            rotationSpeed: simulation.graphics.controls.autoRotateSpeed.toString(),
            shader3d: true,
            showCursor: true,
            radius: '10',
            radiusRange: '0',
            mode2D: true,
            pauseResume: function () {
                options.controls.pause = !options.controls.pause;
            },
            step: function () {
                options.nextFrame = true;
            },
            reset: function () {
                options.scenarioSetup();
            },
            next: function () {
                if (core.simulationIdx < scenariosList.length - 1)
                    options.scenarioSetup(++core.simulationIdx);
            },
            previous: function () {
                if (core.simulationIdx > 0)
                    options.scenarioSetup(--core.simulationIdx);
            },
            snapshotJson: function () {
                snapshotJson();
            },
            importJson: function () {
                uploadJsonZip((name, content) => {
                    options.particle.close();
                    core.importJson(name, content);
                    options.guiInfo.refresh();
                    options.guiParameters.refresh();
                    options.guiControls.refresh();
                });
            },
            hideAxis: function () {
                options.controls.showAxis = !options.controls.showAxis;
                simulation.graphics.showAxis(options.controls.showAxis, simulation.mode2D);
            },
            resetCamera: function () {
                options.particle.followParticle = false;
                simulation.graphics.controls.reset();
            },
            xyCamera: function () {
                options.particle.followParticle = false;
                options.cameraTargetSet(simulation.graphics.controls.target);
            },
            colorMode: function () {
                (colorMode == 'charge') ? (colorMode = 'random') : (colorMode = 'charge');
                simulation.setColorMode(colorMode);
            },
            placeHint: function () {
                alert([
                    'Press Z to place a particle selection on the mouse/pointer position.',
                    'You get particle selections from various sources:',
                    '- Select particles with SHIFT + CLICK + DRAG',
                    '- Press Z to move the selected particles to the mouse pointer position.',
                    '- Press X to generate clones of the selection, then Z to place.',
                    '- If you want to generate any kind of particles, use the "GENERATOR" menu (try G then Z to place a random particle).',
                ].join('\n'));
            },
            home: function () {
                core.simulationIdx = 0;
                options.scenarioSetup(core.simulationIdx);
            },
            mouseHint: () => {
                instructionsPopup();
                return;

                alert([
                    "LEFT BUTTON: select particle/camera rotation (when 3D mode is enabled)",
                    "MIDDLE BUTTON/SCROLL: zoom in/out.",
                    "RIGHT BUTTON: move camera position (pan).",
                    "SHIFT+LEFT CLICK/DRAG: select a group of particles. Also act as a ruler (see INFORMATION/Ruler).",
                    "Hint: Keyboard commands do not work when mouse pointer is over the menus!",
                ].join('\n'));
            },
            deleteAll: () => {
                if (confirm("This will delete all particles.\nAre you sure?")) {
                    core.deleteAll();
                }
            },
            sandbox: () => {
                core.simulationIdx = core.scenariosList.length - 1;
                options.scenarioSetup(core.simulationIdx);
            },
            hideOverlay: () => {
                if (hideOverlay == false) {
                    options.statsPanel.domElement.style.visibility = 'hidden';
                    options.gui.hide();
                    options.mouseHelper.overGUI = false;
                    hideOverlay = true;
                } else {
                    options.statsPanel.domElement.style.visibility = 'visible';
                    options.gui.show();
                    hideOverlay = false;
                }
            },
            close: () => {
                controls.close();
            },
            collapseAll: () => {
                options.collapseList.forEach((obj) => {
                    obj.close();
                });
            },
            record: () => {
                simulation.graphics.capture(simulation.name);
            },
            debug: () => {
            },
            showHelp: () => {
                instructionsPopup();
            },
        };

        const guiControlsSimulation = controls.addFolder("[+] Simulation");
        
        addMenuControl(guiControlsSimulation, "Pause/Resume [SPACE]", 'pauseResume');
        addMenuControl(guiControlsSimulation, "Step [N] (if paused)", 'step');
        addMenuControl(guiControlsSimulation, "Reset [R]", 'reset');
        addMenuControl(guiControlsSimulation, "Next simulation [PAGEDOWN]", 'next');
        addMenuControl(guiControlsSimulation, "Previous simulation [PAGEUP]", 'previous');
        addMenuControl(guiControlsSimulation, "First simulation [HOME]", 'home');
        addMenuControl(guiControlsSimulation, "Export simulation [P]", 'snapshotJson');
        addMenuControl(guiControlsSimulation, "Import simulation [I]", 'importJson');
        addMenuControl(guiControlsSimulation, "Sandbox Mode [S]", 'sandbox');
        addMenuControl(guiControlsSimulation, '2D Mode ✏️', 'mode2D', (val) => {
            simulation.bidimensionalMode(val);
            core.updatePhysics('mode2D', val);
        });
        addMenuControl(guiControlsSimulation, "Delete all particles [DEL]", 'deleteAll');

        const guiControlsCamera = controls.addFolder("[+] Camera");
        addMenuControl(guiControlsCamera, "Reset Position [C]", 'resetCamera');
        addMenuControl(guiControlsCamera, "Orthogonal Position [V] (3D mode)", 'xyCamera');
        addMenuControl(guiControlsCamera, 'Automatic Rotation ✏️', 'automaticRotation', val => {
            if (val == true) {
                if (simulation.mode2D == true) {
                    alert('Cannot do this in 2D mode.');
                    simulation.graphics.controls.autoRotate = false;
                    return;
                }
                simulation.graphics.controls.autoRotate = true;
                simulation.graphics.controls.autoRotateSpeed = 1.0;
            } else {
                simulation.graphics.controls.autoRotate = false;
            }
        });
        addMenuControl(guiControlsCamera, 'Rotation Speed ✏️', 'rotationSpeed', val => {
            val = parseFloat(val);
            if (isNaN(val)) {
                alert('Invalid value.');
                options.controls.rotationSpeed = simulation.graphics.controls.autoRotateSpeed;
                return;
            }
            simulation.graphics.controls.autoRotateSpeed = val;
        });

        const guiControlsView = controls.addFolder("[+] View");
        addMenuControl(guiControlsView, "Hide/Show Origin Axis [A]", 'hideAxis');
        addMenuControl(guiControlsView, "Toggle Color Mode [Q]", 'colorMode');
        addMenuControl(guiControlsView, "Hide Everything [H]", 'hideOverlay');
        addMenuControl(guiControlsView, "Collapse All folders [M]", 'collapseAll');
        addMenuControl(guiControlsView, 'Show Mouse Cursor ✏️', 'showCursor', (val) => {
            if (val == true) {
                options.showCursor();
            } else {
                options.mouseHelper.hideCursor();
                options.controls.showCursor = false;
            }
        });
        addMenuControl(guiControlsView, 'Particle Radius ✏️', 'radius', (val) => {
            core.updatePhysics('radius', val);
        });
        addMenuControl(guiControlsView, 'Particle Radius Range ✏️', 'radiusRange', (val) => {
            core.updatePhysics('radiusRange', val);
        });
        addMenuControl(guiControlsView, '3D Particle Shader ✏️', 'shader3d', (val) => {
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

        addMenuControl(controls, "Mouse and General Controls [?] (click for more...)", 'mouseHint');
        addMenuControl(controls, "Place particles [Z] (click for more...)", 'placeHint');

        controls.add(options.controls, 'close').name('Close 🔺');

        options.collapseList.push(controls);
        options.collapseList.push(guiControlsCamera);
        options.collapseList.push(guiControlsSimulation);
        options.collapseList.push(guiControlsView);
    }

    refresh() {
        options.controls.radius = simulation.particleRadius.toFixed(3);
        options.controls.radiusRange = simulation.particleRadiusRange.toFixed(3);
        options.controls.mode2D = simulation.mode2D;

        refreshCallbackList.forEach((callback) => {
            if (callback != undefined) {
                callback();
            }
        });

        UI.controls.refresh();
    }
}

function downloadRenderPng(name) {
    simulation.graphics.render();
    simulation.graphics.renderer.domElement.toBlob((blob) => {
        downloadFile(blob, name + '.png', "image/png");
    }, 'image/png', 1);
}

function snapshotJson() {
    let content = core.exportJson();
    let name = simulation.name;
    let finalName = generateExportFilename(name)
    
    downloadRenderPng(finalName);
    downloadStringToZip(content, finalName + ".json");
}

let helpPopupElement = undefined;
let wasPausedBefonePopup = false;

function closePopup() {
    document.body.removeChild(helpPopupElement);
    helpPopupElement = undefined;
    if (!wasPausedBefonePopup) {
        options.controls.pause = false;
    }
}

function instructionsPopup() {
    if (helpPopupElement != undefined) {
        closePopup();
        return;
    }

    wasPausedBefonePopup = options.controls.pause;
    options.controls.pause = true;

    // Create the popup container
    helpPopupElement = document.createElement('div');

    helpPopupElement.style.position = 'fixed';
    helpPopupElement.style.top = '0';
    helpPopupElement.style.left = '0';
    helpPopupElement.style.width = '100%';
    helpPopupElement.style.height = '100%';
    helpPopupElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    helpPopupElement.style.display = 'flex';
    helpPopupElement.style.alignItems = 'center';
    helpPopupElement.style.justifyContent = 'center';
    helpPopupElement.style.zIndex = '1000';

    // Create the popup content
    const content = document.createElement('div');
    content.style.backgroundColor = 'rgba(10, 10, 10, 0.7)';
    content.style.padding = '20px';
    content.style.borderRadius = '10px';
    content.style.maxWidth = '600px';
    content.style.width = '90%';
    content.style.maxHeight = '100%';
    content.style.textAlign = 'left';
    content.style.overflowY = 'auto';

    // Add the instructions HTML
    content.innerHTML = `
        <h2>Welcome to particle.js!</h2>
        <p>particle.js is a simplified n-body Particle Physics simulator and sandbox.</p>
        <p>Here are the basic controls to get you started:</p>
        <h3>Mouse Controls:</h3>
        <ul>
            <li><b>LEFT BUTTON:</b> Select particle/camera rotation (when 3D mode is enabled)</li>
            <li><b>MIDDLE BUTTON/SCROLL:</b> Zoom in/out</li>
            <li><b>RIGHT BUTTON:</b> Move camera position (pan)</li>
            <li><b>SHIFT + LEFT CLICK:</b> Select a group of particles. Also acts as a ruler (see INFORMATION/Ruler)</li>
        </ul>
        <h3>Useful Keyboard Controls:</h3>
        <p>Important: Keyboard shortcuts do not work when the mouse pointer is over the menus. So, move your mouse outside before pressing a command key.</p>
        <ul>
            <li><b>SPACE:</b> Pause/Resume simulation</li>
            <li><b>R:</b> Reset simulation</li>
            <li><b>PAGEDOWN:</b> Next simulation</li>
            <li><b>PAGEUP:</b> Previous simulation</li>
            <li><b>HOME:</b> First simulation</li>
            <li><b>Z:</b> Move the selection to the mouse/pointer position. Also place clones and generated particles</li>
            <li><b>X:</b> Generate clones of the selection</li>
            <li><b>G:</b> Generate new particles</li>
            <li>See the menus for more...</li>
        </ul>
        <p>Press <b>?</b> any time to show this popup again.<p>
        <p>Check out the project on <a href="https://github.com/andrenepomuceno/particle.js" target="_blank" style="color: #4CAF50">GitHub</a> for more details.</p>
        <button id="closePopupBtn" style="margin-top: 20px;">Got it!</button>
    `;

    // Append the content to the popup
    helpPopupElement.appendChild(content);

    // Append the popup to the body
    document.body.appendChild(helpPopupElement);

    // Close button functionality
    document.getElementById('closePopupBtn').onclick = () => {
        closePopup();
    };
}

