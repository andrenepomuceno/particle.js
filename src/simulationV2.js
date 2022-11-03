import { randomColor } from './helpers.js';
import { fieldUpdate, fieldCleanup } from './field.js';

function log(msg) {
    console.log("SimulationV2: " + msg);
}

function generateParticleColor(p, absCharge) {
    let h = 0, s = 100, l = 50;
    let lmin = 15, lmax = 50;

    let charge = p.charge;
    if (charge > 0) {
        h = 240;
        l = Math.round(lmin + (lmax - lmin) * Math.abs(charge) / absCharge);
    } else if (charge < 0) {
        h = 0;
        l = Math.round(lmin + (lmax - lmin) * Math.abs(charge) / absCharge);
    } else {
        h = 120;
        l = 60;
    }

    if (p.mass == 0) {
        l = 90;
    }

    if (p.nearCharge > 0) {
        //h -= 20;
    } else if (p.nearCharge < 0) {
        h += 10;
    }

    while (h > 360) h -= 360;
    while (h < 0) h += 360;

    return "hsl(" + h + "," + s + "%," + l + "%)";
}

export class SimulationV2 {
    constructor(graphics, physics, particleList) {
        log("constructor");

        this.graphics = graphics;
        this.physics = physics;

        this.enableMassRadius = true;
        this.enableChargeColor = true;
        this.populateSimulationCallback = undefined;

        if (particleList) {
            this.particleList = particleList;
        } else {
            this.particleList = [];
        }

        this.cleanup();
    }

    setup(populateSimulationCallback, legacyMode=false) {
        log("setup");
        this.cleanup();

        this.populateSimulationCallback = populateSimulationCallback;
        if (legacyMode) {
            log("Populating... (legacy)");
            populateSimulationCallback(this.graphics, this.physics);
        } else {
            log("Populating...");
            populateSimulationCallback(this);
        }
        log("Populating done");

        this.graphics.cameraSetup();
        this.#drawParticles();
        fieldUpdate();
    }

    cleanup() {
        log("cleanup");
        this.graphics.cleanup();

        while (this.particleList.length > 0) {
            this.particleList.pop();
        }

        this.cicles = 0;
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

        fieldCleanup(this.graphics);
        this.graphics.cameraDefault();
    }

    step(dt) {
        // log("step");
        this.energy = 0.0;

        this.graphics.compute();
        ++this.cicles;

        fieldUpdate();

        if (dt < 1e3) this.totalTime += dt;
    }

    state() {
        // log("state");
        let particles = this.particleList.length;
        return [
            this.populateSimulationCallback.name,
            particles,
            this.cicles,
            this.energy / particles,
            this.physics.colisionCounter,
            this.totalMass,
            this.physics.boundaryDistance,
            this.totalTime,
            this.totalCharge,
        ];
    }

    exportCsv() {
        log("exportCsv");
        let output = this.particleList[0].header() + "\n";
        this.particleList.forEach((p, i) => {
            output += p.csv() + "\n";
        });
        output += this.physics.header() + "\n" + this.physics.csv() + "\n";
        output += "cicles\n";
        output += this.cicles + "\n";
        return output;
    }

    paintParticles() {
        const absCharge = Math.max(Math.abs(this.qMin), Math.abs(this.qMax));
        this.particleList.forEach((p, i) => {
            let color;
            if (this.enableChargeColor) {
                color = generateParticleColor(p, absCharge);
            } else {
                color = randomColor();
            }
            p.setColor(color);
        });
    }

    #drawParticles() {
        this.mMin = Infinity, this.mMax = -Infinity;
        this.qMin = Infinity, this.qMax = -Infinity;
        this.particleList.forEach((p, idx) => {
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

        this.paintParticles();
        this.#addParticles();
    }

    #addParticles() {
        let minRadius = this.particleRadius - this.particleRadiusRange / 2;
        let maxRadius = this.particleRadius + this.particleRadiusRange / 2;
        const absMass = Math.max(Math.abs(this.mMin), Math.abs(this.mMax));
        this.particleList.forEach((p, i) => {
            let radius = minRadius;
            if (this.enableMassRadius && absMass != 0) {
                radius += Math.round((maxRadius - minRadius) * Math.abs(p.mass) / absMass);
            }
            p.radius = radius;
        });
        this.graphics.drawParticles(this.particleList, this.physics);
    }
}