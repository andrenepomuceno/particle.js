import { Vector3 } from 'three';
import {
    simulation,
    core,
} from '../core.js';
import { uploadCsv } from '../components/csv';
import { SelectionHelper, SourceType } from '../components/selectionHelper.js';
import { cameraToWorldCoord } from '../helpers.js';

let gGuiOptions;
let gGuiSelection;
let gSelection;
let gMouseHelper;

export function guiSelectionSetup(guiOptions, guiSelection, collapseList, selection, mouseHelper) {
    gGuiOptions = guiOptions;
    gGuiSelection = guiSelection;
    gSelection = selection;
    gMouseHelper = mouseHelper;

    guiOptions.selection = {
        pattern: 'box',
        source: "None",
        particles: 0,
        mass: "",
        charge: "",
        nuclearCharge: "",
        velocity: "",
        velocityDir: "",
        center: "",
        fixedPosition: false,
        export: () => {
            gSelection.export(simulation);
        },
        import: () => {
            uploadCsv((name, content) => {
                //gSelection = new SelectionHelper(simulation.graphics, guiOptions.selection, guiSelection);
                gSelection.clear();
                gSelection.graphics = simulation.graphics;
                gSelection.options = guiOptions.selection;
                gSelection.guiSelection = guiSelection;

                core.importParticleList(gSelection, name, content);
            });
        },
        clone: () => {
            gSelection.clone();
            gSelection.guiRefresh();
        },
        clear: () => {
            guiSelectionClose();
        },
        delete: () => {
            if (gSelection.list == undefined || gSelection.list.length == 0) return;
            if (gSelection.source != SourceType.simulation) {
                alert('Selection source must be "simulation".\nSelect particles first.');
                return;
            }
            core.deleteParticleList(gSelection.list);
            guiSelectionClose();
        },
        lookAt: () => {
            if (gSelection.list.length == 0) return;

            let center = new Vector3();
            gSelection.list.forEach((particle) => {
                center.add(particle.position);
            });
            center.divideScalar(gSelection.list.length);

            guiOptions.cameraTargetSet(center);
        },
        place: () => {
            //guiOptions.controls.placeHint();
            selectionPlace();
        },
    };

    const patternList = {
        Box: 'box',
        Circle: 'circle',
    };
    guiSelection.add(guiOptions.selection, 'pattern', patternList).name("Pattern").listen().onFinishChange(val => {
        switch (val) {
            case 'box':
            default:
                guiOptions.ruler.mode = 'box';
                break;

            case 'circle':
                guiOptions.ruler.mode = 'circle';
                break
        }
    });
    guiSelection.add(guiOptions.selection, 'source').name("Source").listen();
    guiSelection.add(guiOptions.selection, 'particles').name("Particles").listen();

    const guiSelectionProperties = guiSelection.addFolder("[+] Properties");
    guiSelection.guiSelectionProperties = guiSelectionProperties;
    guiSelectionProperties.add(guiOptions.selection, 'mass').name("Mass (sum)").listen().onFinishChange((val) => {
        selectionListUpdate("mass", val);
    });
    guiSelectionProperties.add(guiOptions.selection, 'charge').name("Charge (sum)").listen().onFinishChange((val) => {
        selectionListUpdate("charge", val);
    });
    guiSelectionProperties.add(guiOptions.selection, 'nuclearCharge').name("Nuclear Charge (sum)").listen().onFinishChange((val) => {
        selectionListUpdate("nuclearCharge", val);
    });

    const guiSelectionVariables = guiSelection.addFolder("[+] Variables");
    guiSelectionVariables.add(guiOptions.selection, 'velocity').name("Velocity").listen().onFinishChange((val) => {
        selectionListUpdate("velocityAbs", val);
    });
    guiSelectionVariables.add(guiOptions.selection, 'velocityDir').name("Direction").listen().onFinishChange((val) => {
        selectionListUpdate("velocityDir", val);
    });
    guiSelectionVariables.add(guiOptions.selection, 'center').name("Center").listen().onFinishChange((val) => {
        selectionListUpdate("center", val);
    });
    guiSelectionVariables.add(guiOptions.selection, 'fixedPosition').name("Fixed Position").listen().onFinishChange((val) => {
        selectionListUpdate("fixed", val);
        guiOptions.selection.fixedPosition = val;
    });

    const guiSelectionActions = guiSelection.addFolder("[+] Controls");
    guiSelectionActions.add(guiOptions.selection, 'delete').name("Delete [D]"); // [BACKSPACE]
    guiSelectionActions.add(guiOptions.selection, 'clone').name("Clone [X]");
    guiSelectionActions.add(guiOptions.selection, 'lookAt').name("Look At");
    guiSelectionActions.add(guiOptions.selection, 'export').name("Export");
    guiSelectionActions.add(guiOptions.selection, 'import').name("Import");
    guiSelectionActions.add(guiOptions.selection, 'place').name("Place [Z]");

    guiSelection.add(guiOptions.selection, 'clear').name("Close");

    collapseList.push(guiSelection);
    collapseList.push(guiSelectionActions);
    collapseList.push(guiSelectionProperties);
    collapseList.push(guiSelectionVariables);
}

function guiSelectionClose(clear = true) {
    if (clear) gSelection.clear();
    gGuiSelection.close();
}

function selectionListUpdate(param, val) {
    core.updateParticleList(param, val, gSelection.list);
    gSelection.guiRefresh();
}

function selectionPlace() {
    if (gMouseHelper.overGUI) return;
    if (gSelection.list == undefined || gSelection.list.length == 0) return;

    let center = cameraToWorldCoord(gMouseHelper.position, simulation.graphics.camera, 0);
    if (simulation.mode2D) {
        center.z = 0;
    }

    if (gSelection.source == SourceType.generated) {
        gGuiOptions.generator.generate();
    }

    if (gSelection.source == SourceType.simulation) {
        core.updateParticleList("center", [center.x, center.y, center.z].toString(), gSelection.list);
    } else {
        core.createParticleList(gSelection.list, center);
    }
}