import { Vector3 } from 'three';
import {
    simulation,
    core,
} from '../core.js';
import { SourceType } from '../components/selection';
import { mouseToWorldCoord, uploadJsonZip } from '../helpers.js';
import { UI } from '../../ui/App';

let options = undefined;
let selection = undefined;
let mouse = undefined;

let refreshCallbackList = [];

function addMenuControl(
    folder, title, variable,
    onFinishChange = undefined,
    variableList = undefined,
) {
    const defaultValue = options.selection[variable];

    const item = {
        title: title,
        value: defaultValue,
        onFinish: onFinishChange,
        selectionList: variableList,
        folder
    }
    UI.addItem(UI.selection, item);

    if (typeof defaultValue != 'function') {
        refreshCallbackList.push(() => {
            item.value = options.selection[variable];
        });
    }
}

export class GUISelection {
    constructor(guiOptions) {
        options = guiOptions;
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
            placeStart: () => {
                
            }
        };
    
        const patternList = {
            Box: 'box',
            Circle: 'circle',
        };
        addMenuControl('selection', 'Pattern', 'pattern', (val) => {
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
        addMenuControl('selection', 'Source', 'source')
        addMenuControl('selection', 'Particles', 'particles')
    
        addMenuControl('properties', "Mass (sum)", 'mass', (val) => {
            selectionListUpdate('mass', val);
        });
        addMenuControl('properties', "Charge (sum)", 'charge', (val) => {
            selectionListUpdate('charge', val);
        });
        addMenuControl('properties', "Nuclear Charge (sum)", 'nuclearCharge', (val) => {
            selectionListUpdate('nuclearCharge', val);
        });
        addMenuControl('properties', "Color Charge (sum)", 'colorCharge');

        addMenuControl('properties', 'Velocity', 'velocity', (val) => {
            selectionListUpdate('velocityAbs', val);
        });
        addMenuControl('properties', 'Direction', 'velocityDir', (val) => {
            selectionListUpdate('velocityDir', val);
        });
        addMenuControl('properties', 'Center', 'center', (val) => {
            selectionListUpdate('center', val);
        });
        addMenuControl('properties', 'Fixed Position', 'fixedPosition', (val) => {
            selectionListUpdate('fixed', val);
            options.selection.fixedPosition = val;
        });
    
        addMenuControl('selection', "Clone [X]", 'clone')
        addMenuControl('selection', "Place [Z]", 'place')
        addMenuControl('selection', 'Look At', 'lookAt')
        addMenuControl('selection', 'Export', 'export')
        addMenuControl('selection', 'Import', 'import')
        addMenuControl('selection', "Delete [D]", 'delete')
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
    UI.selection.setOpen(false);
}

function selectionListUpdate(param, val) {
    core.updateParticleList(param, val, selection.list);
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