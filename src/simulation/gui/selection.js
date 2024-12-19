import { Vector3 } from 'three';
import {
    simulation,
    core,
} from '../core.js';
import { SourceType } from '../components/selection';
import { mouseToWorldCoord, uploadJsonZip } from '../helpers.js';
import { UI } from '../../ui/App';

let options = undefined;
let controls = undefined;
let selection = undefined;
let mouse = undefined;

let refreshCallbackList = [];

function translateFolder(folder) {
    const regex = /[a-z]+/i;
    const result = regex.exec(folder.name)[0];
    const map = {
        'SELECTION': 'selection',
        'Properties': 'properties',
        'Variables': 'properties',
        'Controls': 'selection',
    }
    return map[result];
}

function addMenuControl(
    folder, title, variable,
    onFinishChange = undefined,
    variableList = undefined,
) {
    const defaultValue = options.selection[variable];

    if (onFinishChange == undefined) {
        folder.add(options.selection, variable, variableList).name(title).listen();
    }
    else {
        folder.add(options.selection, variable, variableList).name(title).listen().onFinishChange(onFinishChange);
    }

    const item = {
        title: title,
        value: defaultValue,
        onFinish: onFinishChange,
        selectionList: variableList,
        folder: translateFolder(folder)
    }
    UI.addItem(UI.selection, item);

    if (typeof defaultValue != 'function') {
        refreshCallbackList.push(() => {
            item.value = options.selection[variable];
        });
    }
}

export class GUISelection {
    constructor(guiOptions, guiSelection) {
        options = guiOptions;
        controls = guiSelection;
        selection = options.selectionHelper;
        mouse = options.mouseHelper;

        this.setup();
    }

    setup() {
        options.selection = {
            pattern: 'box',
            source: 'None',
            particles: 0,
            mass: '',
            charge: '',
            nuclearCharge: '',
            colorCharge: '',
            velocity: '',
            velocityDir: '',
            center: '',
            fixedPosition: false,
            export: () => {
                selection.exportJson();
            },
            import: () => {
                uploadJsonZip((name, content) => {
                    selection.clear();    
                    core.importParticleListJson(selection, name, content);
                });
            },
            clone: () => {
                selection.clone();
                this.refresh();
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
        addMenuControl(controls, 'Pattern', 'pattern', (val) => {
            switch (val) {
                case 'box':
                default:
                    options.ruler.mode = 'box';
                    break;
    
                case 'circle':
                    options.ruler.mode = 'circle';
                    break
            }
            options.selection.pattern = val;
            // console.log(val);
        }, patternList);
        addMenuControl(controls, 'Source', 'source')
        addMenuControl(controls, 'Particles', 'particles')
    
        const guiSelectionProperties = controls.addFolder("[+] Properties ✏️");
        addMenuControl(guiSelectionProperties, "Mass (sum)", 'mass', (val) => {
            selectionListUpdate('mass', val);
        });
        addMenuControl(guiSelectionProperties, "Charge (sum)", 'charge', (val) => {
            selectionListUpdate('charge', val);
        });
        addMenuControl(guiSelectionProperties, "Nuclear Charge (sum)", 'nuclearCharge', (val) => {
            selectionListUpdate('nuclearCharge', val);
        });
        addMenuControl(guiSelectionProperties, "Color Charge (sum)", 'colorCharge'/*, (val) => {
            //selectionListUpdate('colorCharge', val);
        }*/);
        guiSelectionProperties.open();
    
        const guiSelectionVariables = controls.addFolder("[+] Variables ✏️");
        addMenuControl(guiSelectionVariables, 'Velocity', 'velocity', (val) => {
            selectionListUpdate('velocityAbs', val);
        });
        addMenuControl(guiSelectionVariables, 'Direction', 'velocityDir', (val) => {
            selectionListUpdate('velocityDir', val);
        });
        addMenuControl(guiSelectionVariables, 'Center', 'center', (val) => {
            selectionListUpdate('center', val);
        });
        addMenuControl(guiSelectionVariables, 'Fixed Position', 'fixedPosition', (val) => {
            selectionListUpdate('fixed', val);
            options.selection.fixedPosition = val;
        });
    
        const guiSelectionControls = controls.addFolder("[+] Controls");
        addMenuControl(guiSelectionControls, "Clone [X]", 'clone')
        addMenuControl(guiSelectionControls, "Place [Z]", 'place')
        addMenuControl(guiSelectionControls, 'Look At', 'lookAt')
        addMenuControl(guiSelectionControls, 'Export', 'export')
        addMenuControl(guiSelectionControls, 'Import', 'import')
        addMenuControl(guiSelectionControls, "Delete [D]", 'delete')
        
        controls.add(options.selection, 'clear').name('Close 🔺');
    
        options.collapseList.push(controls);
        options.collapseList.push(guiSelectionControls);
        //options.collapseList.push(guiSelectionProperties);
        options.collapseList.push(guiSelectionVariables);
    }

    refresh() {
        selection.guiRefresh();

        refreshCallbackList.forEach((callback) => {
            if (callback != undefined) {
                callback();
            }
        })
    }
}

function guiSelectionClose(clear = true) {
    if (clear) selection.clear();
    controls.close();

    UI.selection.setOpen(false);
}

function selectionListUpdate(param, val) {
    core.updateParticleList(param, val, selection.list);
    this.refresh();
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
        core.updateParticleList('center', [center.x, center.y, center.z].toString(), selection.list);
    } else {
        core.createParticleList(selection.list, center);
    }
}