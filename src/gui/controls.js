import {
    downloadFile, exportFilename as generateExportFilename, uploadFile
} from '../helpers.js';
import {
    simulation,
    core,
} from '../core.js';
import { scenariosList } from '../scenarios.js';
import { exportCSV } from '../components/csv';

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
            snapshot: function () {
                snapshot();
            },
            snapshotJson: function () {
                snapshotJson();
            },
            import: function () {
                uploadFile('.csv', (name, content) => {
                    options.particle.close();
                    core.importCSV(name, content);
                    options.guiInfo.refresh();
                    options.guiParameters.refresh();
                    options.guiControls.refresh();
                });
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
                console.log(exportCSV(simulation));
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

        controls.add(options.controls, 'mouseHint').name("Mouse Controls (click for more...)");
        controls.add(options.controls, 'placeHint').name("Place particles [Z] (click for more...)");
        controls.add(options.controls, 'sandbox').name("Sandbox Mode [S]");
        controls.add(options.controls, 'snapshot').name("Export simulation [P]");
        controls.add(options.controls, 'import').name("Import simulation [I]");
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

function snapshot() {
    let name = simulation.name;
    let finalName = generateExportFilename(name)
    log('snapshot ' + finalName);

    downloadRenderPng(finalName)
    downloadFile(exportCSV(simulation), finalName + '.csv', "text/plain;charset=utf-8");
}

const JSZip = require('jszip');

function downloadStringToZip(jsonContent, filename) {
    return new Promise(() => {
        var zip = new JSZip();
        zip.file(filename, jsonContent);
        zip.generateAsync({
            type: "blob",
            compression: "DEFLATE"
        })
        .then(function(content) {
            downloadFile(content, filename + '.zip', "data:application/zip;");
        });
    });
}

function snapshotJson() {
    let content = core.exportJson();
    let name = simulation.name;
    let finalName = generateExportFilename(name)

    downloadRenderPng(finalName);
    downloadStringToZip(content, finalName + ".json");
}

function uploadJsonZip(callback) {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json.zip';
    input.onchange = e => {
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = readerEvent => {
            let fileData = readerEvent.target.result;

            let zip = new JSZip();
            zip.loadAsync(fileData).then(function (zip) {
                let jsonFilename = file.name.replace(".zip", "");
                zip.file(jsonFilename).async("string").then((jsonData) => {
                    callback(jsonFilename, jsonData);
                })
            });
        }
    }

    input.click();
}
