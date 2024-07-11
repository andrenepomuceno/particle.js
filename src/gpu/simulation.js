import { fillParticleRadius, fillParticleColor } from '../helpers';
import { calcListStatistics } from '../physics';

function log(msg) {
    let timestamp = new Date().toISOString();
    console.log(timestamp + " | Simulation: " + msg);
}

export class SimulationGPU {
    constructor(graphics, physics) {
        log('constructor');

        this.graphics = graphics;
        this.physics = physics;
        this.particleList = physics.particleList;

        this.enableMassRadius = true;
        this.enableChargeColor = true;
        this.populateSimulationCallback = undefined;

        this.field = undefined;

        this.name = 'untitled';
        this.mode2D = false;

        this.cycles = 0;
        this.totalTime = 0.0;
        this.particleRadius = 20;
        this.particleRadiusRange = 10;

        this.computeTime = [];
        this.stats = {};

        this.actionList = [];
    }

    setup(populateSimulationCallback) {
        log('setup');

        if (populateSimulationCallback != undefined) {
            this.populateSimulationCallback = populateSimulationCallback;
            this.name = populateSimulationCallback.name;
            this.folderName = populateSimulationCallback.folderName;

            this.graphics.cameraDefault();

            log('Populating ' + populateSimulationCallback.name + '...');
            populateSimulationCallback(this);
            log('Populating done.');
            
            log('Sorting action list...');
            this.actionList = this.actionList.sort((a, b) => {
                return a.cycle - b.cycle;
            });

            this.physics.mode2D = this.mode2D;
            this.graphics.cameraSetup();
            this.bidimensionalMode();
            this.setParticleRadius();
        } else {
            log("populateSimulationCallback is undefined, skipping...");
        }

        this.drawParticles();
    }

    step(dt) {
        // log('step');

        let t0 = performance.now();

        this.graphics.compute();
        ++this.cycles;
        if (dt < 1e3) this.totalTime += dt;

        let t1 = performance.now();
        this.computeTime.push(t1 - t0);
        if (this.computeTime.length > 10 * 60) this.computeTime.shift();

        let action = this.actionList[0];
        if (action != undefined && action.cycle <= this.cycles) {
            log("Executing action for cycle " + action.cycle);
            action.callback();
            this.actionList.shift();
        }
    }

    addAction(action = {
        cycle: 0,
        callback: ()=>{}
    }) {
        this.actionList.push(action);
    }

    addActionArray(array) {
        this.actionList.push(...array);
    }

    getComputeTime() {
        if (this.computeTime.length == 0) return { avg: 0, max: 0 };

        let sum = 0;
        let max = 0;
        this.computeTime.forEach(v => {
            sum += v;
            if (v > max) max = v;
        });
        return {
            avg: sum / this.computeTime.length,
            max: max,
        };
    }

    setColorMode(mode) {
        log("setColorMode mode = " + mode);

        switch (mode) {
            case 'random':
                this.enableChargeColor = false;
                break;

            case 'charge':
            default:
                this.enableChargeColor = true;
                break;
        }

        this.#fillParticleColor();
        this.graphics.fillPointColors();
    }

    setParticleRadius(radius, range) {
        log('setParticleRadius ' + radius + ' ' + range);

        if (radius == undefined) radius = this.particleRadius;
        if (range == undefined) range = this.particleRadiusRange;

        this.particleRadius = radius;
        this.particleRadiusRange = range;

        if (this.particleList != undefined && this.particleList.length > 0) {
            this.#fillParticleRadius();
            this.graphics.fillPointRadius();
        }
    }

    drawParticles() {
        log('drawParticles');

        if (this.particleList == undefined) {
            log("Undefined particle list!");
            return;
        }

        if (this.particleList.length == 0) {
            log("Empty particle list! Continuing...");
        };

        this.stats = calcListStatistics(this.particleList);
        this.#fillParticleRadius();
        this.#fillParticleColor();
        this.graphics.drawParticles(this.particleList, this.physics);
    }

    #fillParticleRadius() {
        log("#fillParticleRadius");
        fillParticleRadius(this.particleList, this.particleRadius, this.particleRadiusRange, this.stats.mMin, this.stats.mMax, this.enableMassRadius);
    }

    #fillParticleColor() {
        log("#fillParticleColor");
        fillParticleColor(this.particleList, this.stats.qMin, this.stats.qMax, this.enableChargeColor);
    }

    bidimensionalMode(enable) {
        log('bidimensionalMode ' + enable);

        if (enable != undefined) this.mode2D = enable;

        if (this.mode2D) {
            this.graphics.controls.enableRotate = false;
        } else {
            this.graphics.controls.enableRotate = true;
        }
    }
}