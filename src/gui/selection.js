import { Vector3 } from 'three';
import {
    simulation,
    core,
} from '../core.js';
import { uploadCsv } from '../components/csv';
import { Selection, SourceType } from '../components/selection';
import { mouseToWorldCoord } from '../helpers.js';

let options = undefined;
let controls = undefined;
let selection = undefined;
let mouse = undefined;

export class GUISelection {
    constructor(guiOptions, guiSelection) {
        options = guiOptions;
        controls = guiSelection;
    }

    setup() {
        console.log('guiSelectionSetup');
    
        selection = options.selectionHelper;
        mouse = options.mouseHelper;
    
        options.selection = {
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
                selection.export(simulation);
            },
            import: () => {
                uploadCsv((name, content) => {
                    //gSelection = new Selection(simulation.graphics, options.selection, guiSelection);
                    selection.clear();
                    selection.graphics = simulation.graphics;
                    selection.options = options.selection;
                    selection.guiSelection = guiSelection;
    
                    core.importParticleList(selection, name, content);
                });
            },
            clone: () => {
                selection.clone();
                selection.guiRefresh();
            },
            clear: () => {
                guiSelectionClose();
            },
            delete: () => {
                if (selection.list == undefined || selection.list.length == 0) return;
                if (selection.source != SourceType.simulation) {
                    alert('Selection source must be "simulation".\nSelect particles first.');
                    return;
                }
                core.deleteParticleList(selection.list);
                guiSelectionClose();
            },
            lookAt: () => {
                if (selection.list.length == 0) return;
    
                let center = new Vector3();
                selection.list.forEach((particle) => {
                    center.add(particle.position);
                });
                center.divideScalar(selection.list.length);
    
                options.cameraTargetSet(center);
            },
            place: () => {
                //options.controls.placeHint();
                selectionPlace();
            },
        };
    
        const patternList = {
            Box: 'box',
            Circle: 'circle',
        };
        controls.add(options.selection, 'pattern', patternList).name("Pattern").listen().onFinishChange(val => {
            switch (val) {
                case 'box':
                default:
                    options.ruler.mode = 'box';
                    break;
    
                case 'circle':
                    options.ruler.mode = 'circle';
                    break
            }
        });
        controls.add(options.selection, 'source').name("Source").listen();
        controls.add(options.selection, 'particles').name("Particles").listen();
    
        const guiSelectionProperties = controls.addFolder("[+] Properties");
        controls.guiSelectionProperties = guiSelectionProperties;
        guiSelectionProperties.add(options.selection, 'mass').name("Mass (sum)").listen().onFinishChange((val) => {
            selectionListUpdate("mass", val);
        });
        guiSelectionProperties.add(options.selection, 'charge').name("Charge (sum)").listen().onFinishChange((val) => {
            selectionListUpdate("charge", val);
        });
        guiSelectionProperties.add(options.selection, 'nuclearCharge').name("Nuclear Charge (sum)").listen().onFinishChange((val) => {
            selectionListUpdate("nuclearCharge", val);
        });
    
        const guiSelectionVariables = controls.addFolder("[+] Variables");
        guiSelectionVariables.add(options.selection, 'velocity').name("Velocity").listen().onFinishChange((val) => {
            selectionListUpdate("velocityAbs", val);
        });
        guiSelectionVariables.add(options.selection, 'velocityDir').name("Direction").listen().onFinishChange((val) => {
            selectionListUpdate("velocityDir", val);
        });
        guiSelectionVariables.add(options.selection, 'center').name("Center").listen().onFinishChange((val) => {
            selectionListUpdate("center", val);
        });
        guiSelectionVariables.add(options.selection, 'fixedPosition').name("Fixed Position").listen().onFinishChange((val) => {
            selectionListUpdate("fixed", val);
            options.selection.fixedPosition = val;
        });
    
        const guiSelectionActions = controls.addFolder("[+] Controls");
        guiSelectionActions.add(options.selection, 'delete').name("Delete [D]"); // [BACKSPACE]
        guiSelectionActions.add(options.selection, 'lookAt').name("Look At");
        guiSelectionActions.add(options.selection, 'export').name("Export");
        guiSelectionActions.add(options.selection, 'import').name("Import");
    
        controls.add(options.selection, 'clone').name("Clone [X]");
        controls.add(options.selection, 'place').name("Place [Z]");
        controls.add(options.selection, 'clear').name("Close");
    
        options.collapseList.push(controls);
        options.collapseList.push(guiSelectionActions);
        options.collapseList.push(guiSelectionProperties);
        options.collapseList.push(guiSelectionVariables);
    
        console.log('guiSelectionSetup done');
    }
}

function guiSelectionClose(clear = true) {
    console.log(selection);
    if (clear) selection.clear();
    controls.close();
}

function selectionListUpdate(param, val) {
    core.updateParticleList(param, val, selection.list);
    selection.guiRefresh();
}

function selectionPlace() {
    if (mouse.overGUI) return;
    if (selection.list == undefined || selection.list.length == 0) return;

    let center = mouseToWorldCoord(mouse.position, simulation.graphics.camera, 0);
    if (simulation.mode2D) {
        center.z = 0;
    }

    if (selection.source == SourceType.generated) {
        options.generator.generate();
    }

    if (selection.source == SourceType.simulation) {
        core.updateParticleList("center", [center.x, center.y, center.z].toString(), selection.list);
    } else {
        core.createParticleList(selection.list, center);
    }
}