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

export function guiControlsSetup(guiOptions, guiControls) {
    guiOptions.controls = {
        pause: false,
        automaticRotation: false,
        rotationSpeed: simulation.graphics.controls.autoRotateSpeed.toString(),
        shader3d: true,
        showCursor: true,
        pauseResume: function () {
            guiOptions.controls.pause = !guiOptions.controls.pause;
        },
        step: function () {
            guiOptions.nextFrame = true;
        },
        reset: function () {
            guiOptions.scenarioSetup();
        },
        next: function () {
            if (core.simulationIdx < scenariosList.length - 1)
                guiOptions.scenarioSetup(++core.simulationIdx);
        },
        previous: function () {
            if (core.simulationIdx > 0)
                guiOptions.scenarioSetup(--core.simulationIdx);
        },
        snapshot: function () {
            snapshot();
        },
        import: function () {
            uploadCsv((name, content) => {
                guiOptions.particle.close();
                core.importCSV(name, content);
                guiInfoRefresh(guiOptions, guiOptions.energyPanel);
                guiParametersRefresh(guiOptions);
            });
        },
        hideAxis: function () {
            hideAxis = !hideAxis;
            simulation.graphics.showAxis(!hideAxis);
        },
        resetCamera: function () {
            guiOptions.particle.followParticle = false;
            simulation.graphics.controls.reset();
        },
        xyCamera: function () {
            guiOptions.particle.followParticle = false;
            guiOptions.cameraTargetSet(simulation.graphics.controls.target);
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
            guiOptions.scenarioSetup(core.simulationIdx);
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
            guiOptions.scenarioSetup(core.simulationIdx);
        },
        hideOverlay: () => {
            if (hideOverlay == false) {
                guiOptions.statsPanel.domElement.style.visibility = "hidden";
                guiOptions.gui.hide();
                guiOptions.mouseHelper.overGUI = false;
                hideOverlay = true;
            } else {
                guiOptions.statsPanel.domElement.style.visibility = "visible";
                guiOptions.gui.show();
                hideOverlay = false;
            }
        },
        close: () => {
            guiControls.close();
        },
        collapseAll: () => {
            guiOptions.collapseList.forEach((obj) => {
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

    guiControls.add(guiOptions.controls, 'mouseHint').name("Mouse Controls (click for more...)");
    guiControls.add(guiOptions.controls, 'placeHint').name("Place particles [Z] (click for more...)");

    const guiControlsSimulation = guiControls.addFolder("[+] Simulation");
    guiControlsSimulation.add(guiOptions.controls, 'pauseResume').name("Pause/Resume [SPACE]");
    guiControlsSimulation.add(guiOptions.controls, 'step').name("Step [N] (if paused)");
    guiControlsSimulation.add(guiOptions.controls, 'reset').name("Reset [R]");
    guiControlsSimulation.add(guiOptions.controls, 'next').name("Next simulation [PAGEDOWN]");
    guiControlsSimulation.add(guiOptions.controls, 'previous').name("Previous simulation [PAGEUP]");
    guiControlsSimulation.add(guiOptions.controls, 'home').name("First simulation [HOME]");

    const guiControlsCamera = guiControls.addFolder("[+] Camera");
    guiControlsCamera.add(guiOptions.controls, 'resetCamera').name("Reset Camera [C]");
    guiControlsCamera.add(guiOptions.controls, 'xyCamera').name("XY Camera [V]");
    guiControlsCamera.add(guiOptions.controls, 'automaticRotation').name("Automatic Rotation").listen().onFinishChange(val => {
        if (val == true) {
            if (simulation.mode2D == true) {
                alert('Cannot do this in 2D mode.');
                guiOptions.controls.automaticRotation = false;
                simulation.graphics.controls.autoRotate = false;
                return;
            }
            simulation.graphics.controls.autoRotate = true;
            simulation.graphics.controls.autoRotateSpeed = 1.0;
        } else {
            simulation.graphics.controls.autoRotate = false;
        }
    });
    guiControlsCamera.add(guiOptions.controls, 'rotationSpeed').name("Rotation Speed").listen().onFinishChange(val => {
        val = parseFloat(val);
        if (isNaN(val)) {
            alert('Invalid value.');
            guiOptions.controls.rotationSpeed = simulation.graphics.controls.autoRotateSpeed;
            return;
        }
        simulation.graphics.controls.autoRotateSpeed = val;
    });

    const guiControlsView = guiControls.addFolder("[+] View");
    guiControlsView.add(guiOptions.controls, 'hideAxis').name("Hide/Show Axis [A]");
    guiControlsView.add(guiOptions.controls, 'colorMode').name("Color Mode [Q]");
    guiControlsView.add(guiOptions.controls, 'hideOverlay').name("Hide Overlay [H]");
    guiControlsView.add(guiOptions.controls, 'collapseAll').name("Collapse all folders [M]");
    guiControlsView.add(guiOptions.controls, 'showCursor').name("Show Cursor").listen().onFinishChange((val) => {
        if (val == true) {
            guiOptions.showCursor();
        } else {
            guiOptions.mouseHelper.hideCursor();
            guiOptions.controls.showCursor = false;
        }
    });
    guiControlsView.add(guiOptions.controls, 'shader3d').name("3D Shader").listen().onFinishChange(val => {
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

    guiControls.add(guiOptions.controls, 'sandbox').name("Sandbox Mode [S]");
    guiControls.add(guiOptions.controls, 'snapshot').name("Export simulation [P]");
    guiControls.add(guiOptions.controls, 'import').name("Import simulation [I]");
    guiControls.add(guiOptions.controls, 'deleteAll').name("Delete all particles [DEL]");

    guiControls.add(guiOptions.controls, 'close').name("Close");

    guiOptions.collapseList.push(guiControls);
    guiOptions.collapseList.push(guiControlsCamera);
    guiOptions.collapseList.push(guiControlsSimulation);
    guiOptions.collapseList.push(guiControlsView);
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