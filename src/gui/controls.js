import {
    downloadFile, exportFilename
} from '../helpers.js';
import {
    simulation,
    core,
} from '../core.js';
import { scenariosList } from '../scenarios.js';
import { exportCSV, uploadCsv } from '../components/csv';

import { guiInfoRefresh } from './info.js';
import { guiParametersRefresh } from './parameters.js';

function log(msg) {
    console.log("menu/controls: " + msg);
}

let hideAxis = false;
let colorMode = "charge";
let hideOverlay = false;

export class GUIControls {
    constructor(guiOptions, guiControls) {
        this.options = guiOptions;
        this.controls = guiControls;
    }

    setup() {
        this.options.controls = {
            pause: false,
            automaticRotation: false,
            rotationSpeed: simulation.graphics.controls.autoRotateSpeed.toString(),
            shader3d: true,
            showCursor: true,
            radius: '10',
            radiusRange: '0',
            pauseResume: function () {
                this.options.controls.pause = !this.options.controls.pause;
            },
            step: function () {
                this.options.nextFrame = true;
            },
            reset: function () {
                this.options.scenarioSetup();
            },
            next: function () {
                if (core.simulationIdx < scenariosList.length - 1)
                    this.options.scenarioSetup(++core.simulationIdx);
            },
            previous: function () {
                if (core.simulationIdx > 0)
                    this.options.scenarioSetup(--core.simulationIdx);
            },
            snapshot: function () {
                snapshot();
            },
            import: function () {
                uploadCsv((name, content) => {
                    this.options.particle.close();
                    core.importCSV(name, content);
                    guiInfoRefresh();
                    guiParametersRefresh();
                    this.options.guiControls.refresh();
                });
            },
            hideAxis: function () {
                hideAxis = !hideAxis;
                simulation.graphics.showAxis(!hideAxis);
            },
            resetCamera: function () {
                this.options.particle.followParticle = false;
                simulation.graphics.controls.reset();
            },
            xyCamera: function () {
                this.options.particle.followParticle = false;
                this.options.cameraTargetSet(simulation.graphics.controls.target);
            },
            colorMode: function () {
                (colorMode == "charge") ? (colorMode = "random") : (colorMode = "charge");
                simulation.setColorMode(colorMode);
            },
            placeHint: function () {
                alert(
                    'Press "Z" to place a particle selection on the mouse/pointer position.\n' +
                    'You can get particle selections from various sources:\n' +
                    '- Select particles with SHIFT + CLICK + DRAG, then press "Z" to move the particles!\n' +
                    '- If you want to make clones, press "X" or the "Clone" button on the selection folder.\n' +
                    '- If you want to generate new particles, use the "SELECTION GENERATOR" menu. (or press "G" then "Z")\n'
                );
            },
            wip: function () {
                alert("Work in progress!");
            },
            home: function () {
                core.simulationIdx = 0;
                this.options.scenarioSetup(core.simulationIdx);
            },
            mouseHint: () => {
                alert(
                    "LEFT BUTTON: select particle/camera rotation (3D mode only)\n" +
                    "MIDDLE BUTTON/SCROLL: zoom in/out.\n" +
                    "RIGHT BUTTON: move camera position (pan).\n" +
                    "SHIFT+LEFT CLICK/DRAG: select a group of particles.\n" +
                    "HINT: Keyboard commands do not work when mouse pointer is over the menus!"
                );
            },
            deleteAll: () => {
                if (confirm("This will delete all particles.\nAre you sure?")) {
                    core.deleteAll();
                }
            },
            sandbox: () => {
                core.simulationIdx = core.scenariosList.length - 1;
                this.options.scenarioSetup(core.simulationIdx);
            },
            hideOverlay: () => {
                if (hideOverlay == false) {
                    this.options.statsPanel.domElement.style.visibility = "hidden";
                    this.options.gui.hide();
                    this.options.mouseHelper.overGUI = false;
                    hideOverlay = true;
                } else {
                    this.options.statsPanel.domElement.style.visibility = "visible";
                    this.options.gui.show();
                    hideOverlay = false;
                }
            },
            close: () => {
                guiControls.close();
            },
            collapseAll: () => {
                this.options.collapseList.forEach((obj) => {
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

        this.controls.add(this.options.controls, 'mouseHint').name("Mouse Controls (click for more...)");
        this.controls.add(this.options.controls, 'placeHint').name("Place particles [Z] (click for more...)");

        const guiControlsSimulation = this.controls.addFolder("[+] Simulation");
        guiControlsSimulation.add(this.options.controls, 'pauseResume').name("Pause/Resume [SPACE]");
        guiControlsSimulation.add(this.options.controls, 'step').name("Step [N] (if paused)");
        guiControlsSimulation.add(this.options.controls, 'reset').name("Reset [R]");
        guiControlsSimulation.add(this.options.controls, 'next').name("Next simulation [PAGEDOWN]");
        guiControlsSimulation.add(this.options.controls, 'previous').name("Previous simulation [PAGEUP]");
        guiControlsSimulation.add(this.options.controls, 'home').name("First simulation [HOME]");

        const guiControlsCamera = this.controls.addFolder("[+] Camera");
        guiControlsCamera.add(this.options.controls, 'resetCamera').name("Reset Camera [C]");
        guiControlsCamera.add(this.options.controls, 'xyCamera').name("XY Camera [V]");
        guiControlsCamera.add(this.options.controls, 'automaticRotation').name("Automatic Rotation").listen().onFinishChange(val => {
            if (val == true) {
                if (simulation.mode2D == true) {
                    alert('Cannot do this in 2D mode.');
                    this.options.controls.automaticRotation = false;
                    simulation.graphics.controls.autoRotate = false;
                    return;
                }
                simulation.graphics.controls.autoRotate = true;
                simulation.graphics.controls.autoRotateSpeed = 1.0;
            } else {
                simulation.graphics.controls.autoRotate = false;
            }
        });
        guiControlsCamera.add(this.options.controls, 'rotationSpeed').name("Rotation Speed").listen().onFinishChange(val => {
            val = parseFloat(val);
            if (isNaN(val)) {
                alert('Invalid value.');
                this.options.controls.rotationSpeed = simulation.graphics.controls.autoRotateSpeed;
                return;
            }
            simulation.graphics.controls.autoRotateSpeed = val;
        });

        const guiControlsView = this.controls.addFolder("[+] View");
        guiControlsView.add(this.options.controls, 'hideAxis').name("Hide/Show Axis [A]");
        guiControlsView.add(this.options.controls, 'colorMode').name("Color Mode [Q]");
        guiControlsView.add(this.options.controls, 'hideOverlay').name("Hide Overlay [H]");
        guiControlsView.add(this.options.controls, 'collapseAll').name("Collapse all folders [M]");
        guiControlsView.add(this.options.controls, 'showCursor').name("Show Cursor").listen().onFinishChange((val) => {
            if (val == true) {
                this.options.showCursor();
            } else {
                this.options.mouseHelper.hideCursor();
                this.options.controls.showCursor = false;
            }
        });
        guiControlsView.add(this.options.controls, 'shader3d').name("3D Shader").listen().onFinishChange(val => {
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
        guiControlsView.add(this.options.controls, 'radius').name("Particle Radius").listen().onFinishChange((val) => {
            core.updatePhysics("radius", val);
        });
        guiControlsView.add(this.options.controls, 'radiusRange').name("Particle Radius Range").listen().onFinishChange((val) => {
            core.updatePhysics("radiusRange", val);
        });

        this.controls.add(this.options.controls, 'sandbox').name("Sandbox Mode [S]");
        this.controls.add(this.options.controls, 'snapshot').name("Export simulation [P]");
        this.controls.add(this.options.controls, 'import').name("Import simulation [I]");
        this.controls.add(this.options.controls, 'deleteAll').name("Delete all particles [DEL]");

        this.controls.add(this.options.controls, 'close').name("Close");

        this.options.collapseList.push(this.controls);
        this.options.collapseList.push(guiControlsCamera);
        this.options.collapseList.push(guiControlsSimulation);
        this.options.collapseList.push(guiControlsView);
    }

    refresh() {
        this.options.controls.radius = simulation.particleRadius.toFixed(3);
        this.options.controls.radiusRange = simulation.particleRadiusRange.toFixed(3);
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