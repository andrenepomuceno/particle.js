import {
    downloadFile, generateExportFilename, uploadFile, downloadStringToZip, uploadJsonZip
} from '../helpers.js';
import {
    simulation,
    core,
} from '../core.js';
import { scenariosList } from '../scenarios.js';
import { UI } from '../../ui/App';
import { addUIOption } from './uiHelper.js';

function log(msg) {
    console.log("menu/controls: " + msg);
}

let colorMode = 'charge';
let hideOverlay = false;
let options;
let refreshCallbackList = [];

function addMenuControl(
    folder, title, variable,
    onFinishChange = undefined,
) {
    addUIOption({
        folder,
        title,
        variable,
        options: options.controls,
        component: UI.controls,
        refreshCallbacks: refreshCallbackList,
        onFinishChange,
        selectionList: undefined
    });
}

export class GUIControls {
    constructor(guiOptions) {
        options = guiOptions;
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
            home: function () {
                core.simulationIdx = 0;
                options.scenarioSetup(core.simulationIdx);
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
                    options.mouseHelper.overGUI = false;
                    hideOverlay = true;
                } else {
                    options.statsPanel.domElement.style.visibility = 'visible';
                    hideOverlay = false;
                }
            },
            collapseAll: () => {
                options.collapseList.forEach((obj) => {
                    obj.close();
                });
            },
            record: () => {
                simulation.graphics.capture(simulation.name);
            },
        };
        
        addMenuControl('simulation', "Pause/Resume [SPACE]", 'pauseResume');
        addMenuControl('simulation', "Step [N] (if paused)", 'step');
        addMenuControl('simulation', "Reset [R]", 'reset');
        addMenuControl('simulation', "Next simulation [PAGEDOWN]", 'next');
        addMenuControl('simulation', "Previous simulation [PAGEUP]", 'previous');
        addMenuControl('simulation', "First simulation [HOME]", 'home');
        addMenuControl('simulation', "Export simulation [P]", 'snapshotJson');
        addMenuControl('simulation', "Import simulation [I]", 'importJson');
        addMenuControl('simulation', "Sandbox Mode [S]", 'sandbox');
        addMenuControl('simulation', "Delete all particles [DEL]", 'deleteAll');

        addMenuControl('camera', "Reset Position [C]", 'resetCamera');
        addMenuControl('camera', "Orthogonal Position [V] (3D mode)", 'xyCamera');
        addMenuControl('camera', 'Automatic Rotation', 'automaticRotation', val => {
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
        addMenuControl('camera', 'Rotation Speed', 'rotationSpeed', val => {
            val = parseFloat(val);
            if (isNaN(val)) {
                alert('Invalid value.');
                options.controls.rotationSpeed = simulation.graphics.controls.autoRotateSpeed;
                return;
            }
            simulation.graphics.controls.autoRotateSpeed = val;
        });

        addMenuControl('view', "Hide/Show Origin Axis [A]", 'hideAxis');
        addMenuControl('view', "Toggle Color Mode [Q]", 'colorMode');
        addMenuControl('view', "Hide Everything [H]", 'hideOverlay');
        addMenuControl('view', "Collapse All folders [M]", 'collapseAll');
        addMenuControl('view', 'Show Mouse Cursor', 'showCursor', (val) => {
            if (val == true) {
                options.showCursor();
            } else {
                options.mouseHelper.hideCursor();
                options.controls.showCursor = false;
            }
        });        
        addMenuControl('view', '3D Particle Shader', 'shader3d', (val) => {
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
        addMenuControl('view', 'Particle Radius', 'radius', (val) => {
            core.updatePhysics('radius', val);
        });
        addMenuControl('view', 'Particle Radius Range', 'radiusRange', (val) => {
            core.updatePhysics('radiusRange', val);
        });
    }

    refresh() {
        options.controls.radius = simulation.particleRadius.toFixed(3);
        options.controls.radiusRange = simulation.particleRadiusRange.toFixed(3);

        refreshCallbackList.forEach((callback) => {
            if (callback != undefined) {
                callback();
            }
        });
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

