import {
    simulation,
    core,
} from '../core.js';
import { UI } from '../../ui/App';

let options, controls;
const refreshCallbackList = [];

function addMenuControl(
    folder, title, variable,
    onFinishChange = undefined,
) {
    const defaultValue = options.field[variable];
    const variableList = undefined;

    if (onFinishChange == undefined) {
        folder.add(options.field, variable).name(title);
    }
    else {
        folder.add(options.field, variable, variableList).name(title).listen().onFinishChange(onFinishChange);
    }

    const item = {
        title: title,
        value: defaultValue,
        onFinish: onFinishChange,
        selectionList: variableList,
        folder: 'field'
    }
    UI.addItem(UI.field, item);
    if (typeof defaultValue != 'function') {
        refreshCallbackList.push(() => {
            item.value = options.field[variable];
        });
    }
}

export class GUIField {
    constructor(guiOptions, guiField) {
        options = guiOptions;
        controls = guiField;
        this.setup();
    }

    setup() {
        function updateFieldParameter(param, val) {
            val = parseFloat(val);
            //options.field[param] = simulation.field.probeParam[param].toExponential(2);
            if (isNaN(val)) {
                alert('Invalid value.');
                return;
            }
            if (param == 'color') {
                if (val < 0 || val > 3) {
                    alert('Invalid value.');
                    return;
                }
                val = parseInt(val);
            }
            if (simulation.field.probeParam[param] == val) return;
            simulation.field.probeParam[param] = val;
            //options.field[param] = val.toExponential(2);
            options.field.fieldResize();
        }

        options.field = {
            enabled: false,
            m: '1',
            q: '1',
            nq: '1',
            color: '0',
            grid: '50',
            automaticRefresh: true,
            fieldResize: () => {
                if (simulation.field.enable == false) return;
                let center = simulation.graphics.controls.target.clone();
                simulation.field.resize(center);
            },
            close: () => {
                controls.close();
            },
            enable: () => {
                this.fieldEnable(options.field.enabled);
            },
        };

        addMenuControl(controls, "Enable [J]", 'enabled', val => {
            this.fieldEnable(val);
        });
        addMenuControl(controls, 'Automatic Refresh ✏️', 'automaticRefresh', val => {
            if (val == true) {
                options.field.fieldResize();
            }
        });
        addMenuControl(controls, 'Grid ✏️', 'grid', val => {
            options.field.grid = simulation.field.grid[0];
            const grid = Math.round(parseFloat(val));
            if (isNaN(grid)) {
                alert('Invalid value.');
                return;
            }
            if (val == simulation.field.grid[0]) return;
            if (simulation.field.enabled == false || simulation.field.arrowList.length == 0) return;
            let neededSize = simulation.field.checkGridSize(val);
            if (neededSize > 0) {
                alert('Max particles exceeded!\nPlease adjust "Max Particles" parameters or delete existing ones.\nSpace needed: ' + neededSize);
                return;
            }
            core.deleteParticleList(simulation.field.arrowList);
            simulation.field.cleanup();
            if (!fieldInit(grid)) {
                return;
            }
            options.field.grid = grid;
        });
        addMenuControl(controls, 'Mass ✏️', 'm', val => {
            updateFieldParameter('m', val);
        });
        addMenuControl(controls, 'Charge ✏️', 'q', val => {
            updateFieldParameter('q', val);
        });
        addMenuControl(controls, 'Nuclear Charge ✏️', 'nq', val => {
            updateFieldParameter('nq', val);
        });
        addMenuControl(controls, 'Color Charge ✏️', 'color', val => {
            updateFieldParameter('color', val);
        });
        addMenuControl(controls, "Refresh [F]", 'fieldResize');
        controls.add(options.field, 'close').name('Close 🔺');

        options.collapseList.push(controls);

    }

    refresh() {
        let opt = options.field;
        let field = simulation.field;
        opt.enabled = field.enabled;
        opt.m = field.probeParam.m.toExponential(2);
        opt.q = field.probeParam.q.toExponential(2);
        opt.nq = field.probeParam.nq.toExponential(2);
        opt.color = field.probeParam.color.toFixed(0);
        opt.grid = field.grid[0];

        refreshCallbackList.forEach((callback) => {
            if (callback != undefined) {
                callback();
            }
        });

        UI.field.refresh();
    }

    fieldEnable(val) {
        options.field.enabled = false;
        if (val == false) {
            core.deleteParticleList(simulation.field.arrowList);
            simulation.field.cleanup();
            controls.close();
        } else {
            let grid = Math.round(parseFloat(options.field.grid));
            if (isNaN(grid)) {
                alert('Invalid grid value.');
                return;
            }
            simulation.graphics.readbackParticleData();
            if (!fieldInit(grid)) {
                return;
            }
            options.field.enabled = true;
            controls.open();
        }
    }
}

function fieldInit(grid) {
    if (!simulation.field.setup(simulation.field.mode, grid)) {
        return false;
    }
    simulation.drawParticles();
    return true;
}