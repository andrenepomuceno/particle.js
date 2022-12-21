import { fillParticleRadius, fillParticleColor } from '../helpers';
import { ParticleType } from '../particle.js';

function log(msg) {
    console.log("SimulationGPU: " + msg);
}

export class SimulationGPU {
    constructor(graphics, physics) {
        log("constructor");

        this.graphics = graphics;
        this.physics = physics;
        this.particleList = physics.particleList;

        this.enableMassRadius = true;
        this.enableChargeColor = true;
        this.populateSimulationCallback = undefined;

        this.field = undefined;

        this.cleanup();
    }

    setup(populateSimulationCallback) {
        log("setup");

        this.graphics.cleanup();

        if (populateSimulationCallback != undefined) {
            this.populateSimulationCallback = populateSimulationCallback;
            this.name = populateSimulationCallback.name;
            this.folderName = populateSimulationCallback.folderName;

            this.graphics.cameraDefault();

            log("Populating " + populateSimulationCallback.name + "...");
            populateSimulationCallback(this);
            log("Populating done.");

            this.graphics.cameraSetup();
            this.bidimensionalMode();
            this.setParticleRadius();
        } else {
            log("populateSimulationCallback is undefined, skipping...");
        }

        this.drawParticles();
    }

    cleanup() {
        log("cleanup");

        this.name = "untitled";
        this.mode2D = false;

        this.cycles = 0;
        this.energy = 0.0;
        this.particleRadius = 20;
        this.particleRadiusRange = 10;
        this.totalMass = 0.0;
        this.totalTime = 0.0;
        this.totalCharge = 0.0;

        this.mMin = Infinity;
        this.mMax = -Infinity;
        this.qMin = Infinity;
        this.qMax = -Infinity;
    }

    step(dt) {
        // log("step");

        this.graphics.compute();
        ++this.cycles;

        //fieldUpdate();

        if (dt < 1e3) this.totalTime += dt;
    }

    state() {
        // log("state");
        let particles = this.particleList.length;

        let energy = 0.0;
        let collisions = 0.0;
        this.particleList.forEach(p => {
            energy += p.energy();
            collisions += p.collisions;
        })
        this.energy = energy;
        this.physics.collisionCounter = collisions;

        return [
            this.name,
            particles,
            this.cycles,
            this.energy,
            this.physics.collisionCounter,
            this.totalMass,
            this.physics.boundaryDistance,
            this.totalTime,
            this.totalCharge,
        ];
    }

    setColorMode(mode) {
        log("setColorMode mode = " + mode);

        switch (mode) {
            case "random":
                this.enableChargeColor = false;
                break;

            case "charge":
            default:
                this.enableChargeColor = true;
                break;
        }

        this.#fillParticleColor();
        this.graphics.fillPointColors();
    }

    setParticleRadius(radius, range) {
        log("setParticleRadius " + radius + " " + range);

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
        log("drawParticles");

        if (this.particleList == undefined) {
            log("undefined particle list!");
            return;
        }

        if (this.particleList.length == 0) {
            log("Empty particle list! Continuing...");
        };

        this.mMin = Infinity, this.mMax = -Infinity;
        this.qMin = Infinity, this.qMax = -Infinity;

        this.totalMass = 0.0;
        this.energy = 0.0;
        this.totalCharge = 0.0;

        this.particleList.forEach((p, idx) => {
            if (p.type == ParticleType.probe) return;

            if (p.mass > this.mMax) {
                this.mMax = p.mass;
            }
            if (p.mass < this.mMin) {
                this.mMin = p.mass;
            }

            if (p.charge > this.qMax) {
                this.qMax = p.charge;
            }
            if (p.charge < this.qMin) {
                this.qMin = p.charge;
            }

            this.totalMass += Math.abs(p.mass);
            this.energy += (p.mass * p.velocity.lengthSq());
            this.totalCharge += p.charge;
        });

        this.#fillParticleRadius();
        this.#fillParticleColor();
        this.graphics.drawParticles(this.particleList, this.physics);
    }

    #fillParticleRadius() {
        log("#fillParticleRadius");
        fillParticleRadius(this.particleList, this.particleRadius, this.particleRadiusRange, this.mMin, this.mMax, this.enableMassRadius);
    }

    #fillParticleColor() {
        log("#fillParticleColor");
        fillParticleColor(this.particleList, this.qMin, this.qMax, this.enableChargeColor);
    }

    bidimensionalMode(enable) {
        log("bidimensionalMode " + enable);

        if (enable != undefined) this.mode2D = enable;

        if (this.mode2D) {
            this.graphics.controls.enableRotate = false;
        } else {
            this.graphics.controls.enableRotate = true;
        }
    }

    fieldProbeConfig(m = 0, q = 0, nq = 0) {
        log("fieldProbeConfig");

        if (this.field) {
            this.field.probeConfig(m, q, nq);
        }
    }

    fieldSetup(mode = "update", grid = 10) {
        log("fieldSetup");
        log("mode = " + mode);

        if (this.field) {
            let center = this.graphics.controls.target.clone();
            this.field.setup(mode, grid, center);
        }
    }
}