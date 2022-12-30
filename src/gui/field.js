import {
    simulation,
    core,
} from '../core.js';

export class GUIField {
    constructor(guiOptions, guiField) {
        this.options = guiOptions;
        this.controls = guiField;
    }

    setup() {
        function updateFieldParameter(param, val) {
            val = parseFloat(val);
            this.options.field[param] = simulation.field.probeParam[param].toExponential(2);
            if (isNaN(val)) {
                alert("Invalid value.");
                return;
            }
            if (simulation.field.probeParam[param] == val) return;
            simulation.field.probeParam[param] = val;
            this.options.field[param] = val.toExponential(2);
            this.options.field.fieldResize();
        }

        this.options.field = {
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
                this.controls.close();
            },
            enable: () => {
                this.fieldEnable(this.options.field.enabled);
            },
        };

        this.controls.add(this.options.field, 'enabled').name("Enable [J]").listen().onFinishChange(val => {
            this.fieldEnable(val);
        });
        this.controls.add(this.options.field, 'automaticRefresh').name("Automatic Refresh").listen().onFinishChange(val => {
            if (val == true) {
                this.options.field.fieldResize();
            }
        });
        this.controls.add(this.options.field, 'grid').name("Grid").listen().onFinishChange(val => {
            this.options.field.grid = simulation.field.grid[0];
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
            this.options.field.grid = grid;
        });
        this.controls.add(this.options.field, 'm').name("Mass").listen().onFinishChange(val => {
            updateFieldParameter('m', val);
        });
        this.controls.add(this.options.field, 'q').name("Charge").listen().onFinishChange(val => {
            updateFieldParameter('q', val);
        });
        this.controls.add(this.options.field, 'nq').name("Nuclear Charge").listen().onFinishChange(val => {
            updateFieldParameter('nq', val);
        });
        this.controls.add(this.options.field, 'fieldResize').name("Refresh [F]");
        this.controls.add(this.options.field, 'close').name("Close");

        this.options.collapseList.push(this.controls);

    }

    refresh() {
        let opt = this.options.field;
        let field = simulation.field;
        opt.enabled = field.enabled;
        opt.m = field.probeParam.m.toExponential(2);
        opt.q = field.probeParam.q.toExponential(2);
        opt.nq = field.probeParam.nq.toExponential(2);
        opt.grid = field.grid[0];
    }

    fieldEnable(val) {
        this.options.field.enabled = false;
        if (val == false) {
            core.deleteParticleList(simulation.field.arrowList);
            simulation.field.cleanup();
            this.controls.close();
        } else {
            let grid = Math.round(parseFloat(this.options.field.grid));
            if (isNaN(grid)) {
                alert("Invalid grid value.");
                return;
            }
            simulation.graphics.readbackParticleData();
            if (!fieldInit(grid)) {
                return;
            }
            this.options.field.enabled = true;
            this.controls.open();
        }
    }
}

function fieldInit(grid) {
    let center = simulation.graphics.controls.target.clone();
    if (!simulation.field.setup(simulation.field.mode, grid, center)) {
        return false;
    }
    simulation.drawParticles();
    return true;
}