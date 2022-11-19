import { fillParticleRadius, fillParticleColor } from '../helpers';
import { ParticleType } from '../physics';

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

        this.cleanup();
    }

    setup(populateSimulationCallback, legacyMode = false) {
        log("setup");

        if (populateSimulationCallback != undefined) {
            this.populateSimulationCallback = populateSimulationCallback;
            this.name = populateSimulationCallback.name;

            this.graphics.cameraDefault();

            if (legacyMode) {
                log("Populating... (legacy)");
                populateSimulationCallback(this.graphics, this.physics);
            } else {
                log("Populating...");
                populateSimulationCallback(this);
            }
            log("Populating done");

            this.graphics.cameraSetup();
        } else {
            log("populateSimulationCallback is undefined, skipping...");
        }

        this.drawParticles();
        //fieldUpdate();

        //this.graphics.compute();
    }

    cleanup() {
        log("cleanup");

        this.name = "untitled";
        this.mode2D = false;

        this.cycles = 0;
        this.energy = 0.0;
        this.particleRadius = 20;
        this.particleRadiusRange = this.particleRadius / 2;
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

        this.particleRadius = (radius || this.particleRadius);
        this.particleRadiusRange = (range || this.particleRadiusRange);

        if (this.particleList != undefined && this.particleList.length > 0) {
            this.#fillParticleRadius();
            this.graphics.fillPointRadius();
        }
    }

    drawParticles() {
        log("drawParticles")
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

            this.totalMass += p.mass;
            this.energy += (p.mass * p.velocity.lengthSq());
            this.totalCharge += p.charge;
        });

        this.#fillParticleRadius();
        this.#fillParticleColor();

        this.graphics.cleanup();
        this.graphics.drawParticles(this.particleList, this.physics);
    }

    #fillParticleRadius() {
        log("#calcParticleRadius");
        fillParticleRadius(this.particleList, this.particleRadius, this.particleRadiusRange, this.mMin, this.mMax, this.enableMassRadius);
    }

    #fillParticleColor() {
        log("#calcParticleColor");
        fillParticleColor(this.particleList, this.qMin, this.qMax, this.enableChargeColor);
    }

    bidimensionalMode(enable = true) {
        this.mode2D = enable;
        if (enable) {
            this.graphics.controls.enableRotate = false;
        } else {
            this.graphics.controls.enableRotate = true;
        }
    }
}