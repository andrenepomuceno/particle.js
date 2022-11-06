import { randomColor, generateParticleColor } from '../helpers';
import { fieldUpdate, fieldCleanup, setParticleRadius } from '../simulation';

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

        //this.cleanup();
    }

    setup(populateSimulationCallback, legacyMode = false) {
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

        this.graphics.compute();
        ++this.cicles;

        fieldUpdate();

        if (dt < 1e3) this.totalTime += dt;
    }

    state() {
        // log("state");
        let particles = this.particleList.length;

        let energy = 0.0;
        this.particleList.forEach(p => {
            energy += p.energy();
        })
        this.energy = energy;

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

        this.graphics.readbackParticleData();

        let output = this.particleList[0].header() + "\n";
        this.particleList.forEach((p, i) => {
            output += p.csv() + "\n";
        });
        return output;
    }

    exportParametersCsv() {
        log("exportCsv");

        let output = "";
        output += this.physics.header() + ",cicles\n" + this.physics.csv() + "," + this.cicles + "\n";;
        return output;
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
        
        this.#calcParticleColor();
        this.graphics.fillPointColors();
    }

    setParticleRadius(radius, range) {
        this.particleRadius = radius;
        this.particleRadiusRange = range;

        this.#calcParticleRadius();
        this.graphics.fillPointRadius();
    }

    #drawParticles() {
        log("#drawParticles")
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

        this.#calcParticleRadius();
        this.#calcParticleColor();
        this.graphics.drawParticles(this.particleList, this.physics);
    }

    #calcParticleRadius() {
        log("#calcParticleRadius")
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
    }

    #calcParticleColor() {
        log("#calcParticleColor")

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
}