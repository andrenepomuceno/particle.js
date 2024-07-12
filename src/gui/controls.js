import {
    downloadFile, generateExportFilename, uploadFile, downloadStringToZip, uploadJsonZip
} from '../helpers.js';
import {
    simulation,
    core,
} from '../core.js';
import { scenariosList } from '../scenarios.js';

function log(msg) {
    console.log("menu/controls: " + msg);
}

let colorMode = 'charge';
let hideOverlay = false;
let options;
let controls;

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
        guiControlsSimulation.add(options.controls, 'pauseResume').name("Pause/Resume [SPACE]");
        guiControlsSimulation.add(options.controls, 'step').name("Step [N] (if paused)");
        guiControlsSimulation.add(options.controls, 'reset').name("Reset [R]");
        guiControlsSimulation.add(options.controls, 'next').name("Next simulation [PAGEDOWN]");
        guiControlsSimulation.add(options.controls, 'previous').name("Previous simulation [PAGEUP]");
        guiControlsSimulation.add(options.controls, 'home').name("First simulation [HOME]");
        guiControlsSimulation.add(options.controls, 'mode2D').name('2D Mode ✏️').listen().onFinishChange((val) => {
            simulation.bidimensionalMode(val);
        });

        const guiControlsCamera = controls.addFolder("[+] Camera");
        guiControlsCamera.add(options.controls, 'resetCamera').name("Reset Camera [C]");
        guiControlsCamera.add(options.controls, 'xyCamera').name("Orthogonal Camera [V]");
        guiControlsCamera.add(options.controls, 'automaticRotation').name('Automatic Rotation ✏️').listen().onFinishChange(val => {
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
        guiControlsCamera.add(options.controls, 'rotationSpeed').name('Rotation Speed ✏️').listen().onFinishChange(val => {
            val = parseFloat(val);
            if (isNaN(val)) {
                alert('Invalid value.');
                options.controls.rotationSpeed = simulation.graphics.controls.autoRotateSpeed;
                return;
            }
            simulation.graphics.controls.autoRotateSpeed = val;
        });

        const guiControlsView = controls.addFolder("[+] View");
        guiControlsView.add(options.controls, 'hideAxis').name("Hide/Show Axis [A]");
        guiControlsView.add(options.controls, 'colorMode').name("Color Mode [Q]");
        guiControlsView.add(options.controls, 'hideOverlay').name("Hide Overlay [H]");
        guiControlsView.add(options.controls, 'collapseAll').name("Collapse all folders [M]");
        guiControlsView.add(options.controls, 'showCursor').name('Show Cursor ✏️').listen().onFinishChange((val) => {
            if (val == true) {
                options.showCursor();
            } else {
                options.mouseHelper.hideCursor();
                options.controls.showCursor = false;
            }
        });
        guiControlsView.add(options.controls, 'shader3d').name('3D Shader ✏️').listen().onFinishChange(val => {
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
        guiControlsView.add(options.controls, 'radius').name('Particle Radius ✏️').listen().onFinishChange((val) => {
            core.updatePhysics('radius', val);
        });
        guiControlsView.add(options.controls, 'radiusRange').name('Particle Radius Range ✏️').listen().onFinishChange((val) => {
            core.updatePhysics('radiusRange', val);
        });

        controls.add(options.controls, 'mouseHint').name("Mouse Controls [?] (click for more...)");
        controls.add(options.controls, 'placeHint').name("Place particles [Z] (click for more...)");
        controls.add(options.controls, 'sandbox').name("Sandbox Mode [S]");
        controls.add(options.controls, 'snapshotJson').name("Export simulation [P]");
        controls.add(options.controls, 'importJson').name("Import simulation [I]");
        controls.add(options.controls, 'deleteAll').name("Delete all particles [DEL]");
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

let helpPopup = undefined;
function instructionsPopup() {
    if (helpPopup != undefined) {
        document.body.removeChild(helpPopup);
        helpPopup = undefined;
        return;
    }

    // Create the popup container
    helpPopup = document.createElement('div');

    helpPopup.style.position = 'fixed';
    helpPopup.style.top = '0';
    helpPopup.style.left = '0';
    helpPopup.style.width = '100%';
    helpPopup.style.height = '100%';
    helpPopup.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    helpPopup.style.display = 'flex';
    helpPopup.style.alignItems = 'center';
    helpPopup.style.justifyContent = 'center';
    helpPopup.style.zIndex = '1000';

    // Create the popup content
    const content = document.createElement('div');
    content.style.backgroundColor = 'rgba(10, 10, 10, 0.7)';
    content.style.padding = '20px';
    content.style.borderRadius = '10px';
    content.style.maxWidth = '600px';
    content.style.textAlign = 'left';

    // Add the instructions HTML
    content.innerHTML = `
        <h2>Welcome to particle.js!</h2>
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
        <p>Check out the project on <a href="https://github.com/andrenepomuceno/particle.js" target="_blank" style="color: #4CAF50;">GitHub</a> for more details.</p>
        <button id="closePopupBtn" style="margin-top: 20px;">Got it!</button>
    `;

    // Append the content to the popup
    helpPopup.appendChild(content);

    // Append the popup to the body
    document.body.appendChild(helpPopup);

    // Close button functionality
    document.getElementById('closePopupBtn').onclick = () => {
        document.body.removeChild(helpPopup);
        helpPopup = undefined;
    };
}

