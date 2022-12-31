import {
    downloadFile, exportFilename
} from '../helpers.js';
import {
    simulation,
    core,
} from '../core.js';
import { scenariosList } from '../scenarios.js';
import { exportCSV, uploadCsv } from '../components/csv';
import { guiParametersRefresh } from './parameters.js';

function log(msg) {
    console.log("menu/controls: " + msg);
}

let hideAxis = false;
let colorMode = "charge";
let hideOverlay = false;
let options;
let controls;

export class GUIControls {
    constructor(guiOptions, guiControls) {
        options = guiOptions;
        controls = guiControls;
    }

    setup() {
        options.controls = {
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
            snapshot: function () {
                snapshot();
            },
            import: function () {
                uploadCsv((name, content) => {
                    options.particle.close();
                    core.importCSV(name, content);
                    options.guiInfo.refresh();
                    guiParametersRefresh();
                    options.guiControls.refresh();
                });
            },
            hideAxis: function () {
                hideAxis = !hideAxis;
                simulation.graphics.showAxis(!hideAxis);
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
                (colorMode == "charge") ? (colorMode = "random") : (colorMode = "charge");
                simulation.setColorMode(colorMode);
            },
            placeHint: function () {
                alert([
                    'Press "Z" to place a particle selection on the mouse/pointer position.',
                    'You can get particle selections from various sources:',
                    '- Select particles with SHIFT + CLICK + DRAG, then press "Z" to move the particles!',
                    '- If you want to make clones, press "X" or the "Clone" button on the selection folder.',
                    '- If you want to generate new particles, use the "SELECTION GENERATOR" menu. (or press "G" then "Z")',
                ].join('\n'));
            },
            wip: function () {
                alert("Work in progress!");
            },
            home: function () {
                core.simulationIdx = 0;
                options.scenarioSetup(core.simulationIdx);
            },
            mouseHint: () => {
                alert([
                    "LEFT BUTTON: select particle/camera rotation (3D mode only)",
                    "MIDDLE BUTTON/SCROLL: zoom in/out.",
                    "RIGHT BUTTON: move camera position (pan).",
                    "SHIFT+LEFT CLICK/DRAG: select a group of particles.",
                    "HINT: Keyboard commands do not work when mouse pointer is over the menus!",
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
                    options.statsPanel.domElement.style.visibility = "hidden";
                    options.gui.hide();
                    options.mouseHelper.overGUI = false;
                    hideOverlay = true;
                } else {
                    options.statsPanel.domElement.style.visibility = "visible";
                    options.gui.show();
                    hideOverlay = false;
                }
            },
            close: () => {
                guiControls.close();
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
                console.log(exportCSV(simulation));
            },
        };

        controls.add(options.controls, 'mouseHint').name("Mouse Controls (click for more...)");
        controls.add(options.controls, 'placeHint').name("Place particles [Z] (click for more...)");

        const guiControlsSimulation = controls.addFolder("[+] Simulation");
        guiControlsSimulation.add(options.controls, 'pauseResume').name("Pause/Resume [SPACE]");
        guiControlsSimulation.add(options.controls, 'step').name("Step [N] (if paused)");
        guiControlsSimulation.add(options.controls, 'reset').name("Reset [R]");
        guiControlsSimulation.add(options.controls, 'next').name("Next simulation [PAGEDOWN]");
        guiControlsSimulation.add(options.controls, 'previous').name("Previous simulation [PAGEUP]");
        guiControlsSimulation.add(options.controls, 'home').name("First simulation [HOME]");
        guiControlsSimulation.add(options.controls, 'mode2D').name('2D Mode').listen().onFinishChange((val) => {
            simulation.bidimensionalMode(val);
        });

        const guiControlsCamera = controls.addFolder("[+] Camera");
        guiControlsCamera.add(options.controls, 'resetCamera').name("Reset Camera [C]");
        guiControlsCamera.add(options.controls, 'xyCamera').name("XY Camera [V]");
        guiControlsCamera.add(options.controls, 'automaticRotation').name("Automatic Rotation").listen().onFinishChange(val => {
            if (val == true) {
                if (simulation.mode2D == true) {
                    alert('Cannot do this in 2D mode.');
                    options.controls.automaticRotation = false;
                    simulation.graphics.controls.autoRotate = false;
                    return;
                }
                simulation.graphics.controls.autoRotate = true;
                simulation.graphics.controls.autoRotateSpeed = 1.0;
            } else {
                simulation.graphics.controls.autoRotate = false;
            }
        });
        guiControlsCamera.add(options.controls, 'rotationSpeed').name("Rotation Speed").listen().onFinishChange(val => {
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
        guiControlsView.add(options.controls, 'showCursor').name("Show Cursor").listen().onFinishChange((val) => {
            if (val == true) {
                options.showCursor();
            } else {
                options.mouseHelper.hideCursor();
                options.controls.showCursor = false;
            }
        });
        guiControlsView.add(options.controls, 'shader3d').name("3D Shader").listen().onFinishChange(val => {
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
        guiControlsView.add(options.controls, 'radius').name("Particle Radius").listen().onFinishChange((val) => {
            core.updatePhysics("radius", val);
        });
        guiControlsView.add(options.controls, 'radiusRange').name("Particle Radius Range").listen().onFinishChange((val) => {
            core.updatePhysics("radiusRange", val);
        });

        controls.add(options.controls, 'sandbox').name("Sandbox Mode [S]");
        controls.add(options.controls, 'snapshot').name("Export simulation [P]");
        controls.add(options.controls, 'import').name("Import simulation [I]");
        controls.add(options.controls, 'deleteAll').name("Delete all particles [DEL]");

        controls.add(options.controls, 'close').name("Close");

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