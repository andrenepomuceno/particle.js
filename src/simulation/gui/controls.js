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
        'CONTROLS': 'simulation',
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
        folder.add(options.controls, variable).name(title).listen();
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
            }
        };

        // addMenuControl(controls, "General Instructions [?]", 'mouseHint');
        // addMenuControl(controls, "Place particles [Z] (click for more...)", 'placeHint');

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
        addMenuControl(guiControlsSimulation, "Delete all particles [DEL]", 'deleteAll');

        const guiControlsCamera = controls.addFolder("[+] Camera");
        addMenuControl(guiControlsCamera, "Reset Position [C]", 'resetCamera');
        addMenuControl(guiControlsCamera, "Orthogonal Position [V] (3D mode)", 'xyCamera');
        addMenuControl(guiControlsCamera, 'Automatic Rotation', 'automaticRotation', val => {
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
        addMenuControl(guiControlsCamera, 'Rotation Speed', 'rotationSpeed', val => {
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
        addMenuControl(guiControlsView, 'Show Mouse Cursor', 'showCursor', (val) => {
            if (val == true) {
                options.showCursor();
            } else {
                options.mouseHelper.hideCursor();
                options.controls.showCursor = false;
            }
        });        
        addMenuControl(guiControlsView, '3D Particle Shader', 'shader3d', (val) => {
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
        addMenuControl(guiControlsView, 'Particle Radius', 'radius', (val) => {
            core.updatePhysics('radius', val);
        });
        addMenuControl(guiControlsView, 'Particle Radius Range', 'radiusRange', (val) => {
            core.updatePhysics('radiusRange', val);
        });

        controls.add(options.controls, 'close').name('Close 🔺');

        options.collapseList.push(controls);
        options.collapseList.push(guiControlsCamera);
        options.collapseList.push(guiControlsSimulation);
        options.collapseList.push(guiControlsView);
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

