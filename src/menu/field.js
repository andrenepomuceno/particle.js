import {
    simulation,
    core,
} from '../core.js';

let gGuiOptions = undefined;
let gGuiField = undefined;

export function guiFieldSetup(guiOptions, guiField, collapseList) {
    function updateFieldParameter(param, val) {
        val = parseFloat(val);
        guiOptions.field[param] = simulation.field.probeParam[param].toExponential(2);
        if (isNaN(val)) {
            alert("Invalid value.");
            return;
        }
        if (simulation.field.probeParam[param] == val) return;
        simulation.field.probeParam[param] = val;
        guiOptions.field[param] = val.toExponential(2);
        guiOptions.field.fieldResize();
    }

    gGuiOptions = guiOptions;
    gGuiField = guiField;

    guiOptions.field = {
        enabled: false,
        m: '1',
        q: '1',
        nq: '1',
        grid: '50',
        automaticRefresh: false,
        fieldResize: () => {
            if (simulation.field.enable == false) return;
            let center = simulation.graphics.controls.target.clone();
            simulation.field.resize(center);
        },
        close: () => {
            guiField.close();
        },
        enable: () => {
            fieldEnable(guiOptions.field.enabled);
        },
    };

    guiField.add(guiOptions.field, 'enabled').name("Enable [J]").listen().onFinishChange(val => {
        fieldEnable(val);
    });
    guiField.add(guiOptions.field, 'automaticRefresh').name("Automatic Refresh").listen().onFinishChange(val => {
        if (val == true) {
            guiOptions.field.fieldResize();
        }
    });
    guiField.add(guiOptions.field, 'grid').name("Grid").listen().onFinishChange(val => {
        guiOptions.field.grid = simulation.field.grid[0];
        const grid = Math.round(parseFloat(val));
        if (isNaN(grid)) {
            alert("Invalid value.");
            return;
        }
        if (val == simulation.field.grid[0]) return;
        if (simulation.field.enabled == false || simulation.field.arrowList.length == 0) return;
        if (simulation.field.checkGridSize(val) == false) {
            alert('Field is too big!');
            return;
        }
        core.deleteParticleList(simulation.field.arrowList);
        simulation.field.cleanup();
        if (!fieldInit(grid)) {
            return;
        }
        guiOptions.field.grid = grid;
    });
    guiField.add(guiOptions.field, 'm').name("Mass").listen().onFinishChange(val => {
        updateFieldParameter('m', val);
    });
    guiField.add(guiOptions.field, 'q').name("Charge").listen().onFinishChange(val => {
        updateFieldParameter('q', val);
    });
    guiField.add(guiOptions.field, 'nq').name("Nuclear Charge").listen().onFinishChange(val => {
        updateFieldParameter('nq', val);
    });
    guiField.add(guiOptions.field, 'fieldResize').name("Refresh [F]");
    guiField.add(guiOptions.field, 'close').name("Close");

    collapseList.push(guiField);
}

export function guiFieldRefresh(guiOptions) {
    let opt = guiOptions.field;
    let field = simulation.field;
    opt.enabled = field.enabled;
    opt.m = field.probeParam.m.toExponential(2);
    opt.q = field.probeParam.q.toExponential(2);
    opt.nq = field.probeParam.nq.toExponential(2);
    opt.grid = field.grid[0];
}

function fieldInit(grid) {
    let center = simulation.graphics.controls.target.clone();
    if (!simulation.field.setup(simulation.field.mode, grid, center)) {
        return false;
    }
    simulation.drawParticles();
    return true;
}

function fieldEnable(val) {
    gGuiOptions.field.enabled = false;
    if (val == false) {
        core.deleteParticleList(simulation.field.arrowList);
        simulation.field.cleanup();
        gGuiField.close();
    } else {
        let grid = Math.round(parseFloat(gGuiOptions.field.grid));
        if (isNaN(grid)) {
            alert("Invalid grid value.");
            return;
        }
        simulation.graphics.readbackParticleData();
        if (!fieldInit(grid)) {
            return;
        }
        gGuiOptions.field.enabled = true;
        gGuiField.open();
    }
}