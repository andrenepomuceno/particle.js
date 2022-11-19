import { randomColor, generateParticleColor } from './../helpers.js';

let particlesSetup = undefined;
const enableMassRadius = true;
let enableChargeColor = true;
let cycles = 0;
let energy = 0.0;
let totalMass = 0.0;
let totalTime = 0.0;
let totalCharge = 0.0;
let maxDistance = 1e6;
let mMin = Infinity, mMax = -Infinity;
let qMin = Infinity, qMax = -Infinity;

function paintParticles(particleList) {
    const absCharge = Math.max(Math.abs(qMin), Math.abs(qMax));
    particleList.forEach((p, i) => {
        let color;
        if (enableChargeColor) {
            color = generateParticleColor(p, absCharge);
        } else {
            color = randomColor();
        }
        p.setColor(color);
    });
}

function boundaryCheck(p1) {
    if (p1.position.length() > maxDistance) {
        let normal = p1.position.clone().multiplyScalar(-1).normalize();
        p1.velocity.reflect(normal);
        //p1.velocity.multiplyScalar(0.9);
        p1.position.add(p1.velocity);
    }
}

function log(msg) {
    console.log("SimulationCPU: " + msg);
}

export class SimulationCPU {
    constructor(graphics, physics) {
        log("constructor");

        this.graphics = graphics;
        this.physics = physics;
        this.particleList = physics.particleList;

        this.populateSimulationCallback = undefined;

        this.particleRadius = 20;
        this.particleRadiusRange = this.particleRadius / 2;

        this.cleanup();
    }

    setup(populateSimulationCallback, legacyMode = false) {
        log("setup");

        this.populateSimulationCallback = populateSimulationCallback;
        this.name = populateSimulationCallback.name;

        console.log("simulationSetup ----------");

        this.cleanup();
        this.fieldCleanup(this.graphics);
        this.graphics.cameraDefault();

        particlesSetup = populateSimulationCallback;

        if (legacyMode) {
            log("Populating... (legacy)");
            populateSimulationCallback(this.graphics, this.physics);
        } else {
            log("Populating...");
            populateSimulationCallback(this);
        }

        this.graphics.cameraSetup();
        this.#drawParticles();
        this.fieldUpdate();

        console.log("simulationSetup done ----------");
    }

    cleanup() {
        log("cleanup");

        /*this.particleList.forEach((p, i) => {
            this.graphics.scene.remove(p.mesh);
        });*/

        this.name = "untitled";
        this.mode2D = false;

        for (var i = this.graphics.scene.children.length - 1; i >= 0; i--) {
            let obj = this.graphics.scene.children[i];
            this.graphics.scene.remove(obj);
        }


        while (this.particleList.length > 0) {
            this.particleList.pop();
        }

        this.particleRadius = 20;
        this.particleRadiusRange = this.particleRadius / 2;

        cycles = 0;
        maxDistance = 1e6;
        totalMass = 0.0;
        energy = 0.0;
        totalTime = 0.0;
    }

    step(dt) {
        // log("step");
        energy = 0.0;
        for (let i = 0; i < this.particleList.length; ++i) {
            let p1 = this.particleList[i];
            for (let j = i + 1; j < this.particleList.length; ++j) {
                let p2 = this.particleList[j];
                this.physics.interact(p1, p2);
            }
            this.physics.update(p1);

            boundaryCheck(p1);

            this.graphics.render(p1);
            energy += p1.energy();
        }
        ++cycles;

        this.fieldUpdate();

        if (dt < 1e3) totalTime += dt;
    }

    state() {
        let particles = this.particleList.length;
        return [
            this.name,
            particles,
            cycles,
            energy,
            this.physics.collisionCounter,
            totalMass,
            maxDistance,
            totalTime,
            totalCharge,
        ];
    }

    setColorMode(mode) {
        switch (mode) {
            case "random":
                enableChargeColor = false;
                break;

            case "charge":
            default:
                enableChargeColor = true
                break;
        }

        paintParticles();
    }

    #drawParticles() {
        log("#drawParticles");
        mMin = Infinity, mMax = -Infinity;
        qMin = Infinity, qMax = -Infinity;
        this.particleList.forEach((p, idx) => {
            if (p.mass > mMax) {
                mMax = p.mass;
            }
            if (p.mass < mMin) {
                mMin = p.mass;
            }

            if (p.charge > qMax) {
                qMax = p.charge;
            }
            if (p.charge < qMin) {
                qMin = p.charge;
            }

            totalMass += Math.abs(p.mass);
            energy += (p.mass * p.velocity.lengthSq());
            totalCharge += p.charge;
        });

        this.#addParticles();
        paintParticles(this.particleList);
    }

    #addParticles() {
        log("#addParticles");
        let minRadius = this.particleRadius - this.particleRadiusRange / 2;
        let maxRadius = this.particleRadius + this.particleRadiusRange / 2;
        const absMass = Math.max(Math.abs(mMin), Math.abs(mMax));
        this.particleList.forEach((p, i) => {
            let radius = minRadius;
            if (enableMassRadius && absMass != 0) {
                radius += Math.round((maxRadius - minRadius) * Math.abs(p.mass) / absMass);
            }
            this.graphics.addParticle(p, radius);
            this.graphics.render(p);
        });
    }

    setParticleRadius(radius, range) {
        log("setParticleRadius " + radius + " " + range);

        if (radius == undefined) radius = this.particleRadius;
        if (range == undefined) range = this.particleRadiusRange;

        this.particleRadius = radius;
        this.particleRadiusRange = range;
    }

    bidimensionalMode(enable = true) {
        this.mode2D = enable;
        if (enable) {
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
    
    fieldSetup(mode = "update", grid = 10, size = 1e3) {
        log("fieldSetup");
        log("mode = " + mode);
    
        if (this.field)
            this.field.setup(mode, grid, size);
    }
    
    fieldUpdate() {
        //log("fieldUpdate");
    
        if (this.field)
            this.field.update();
    }
    
    fieldCleanup() {
        log("fieldCleanup");
    
        if (this.field)
            this.field.cleanup();
    }
    
    fieldProbe(probe) {
        log("fieldProbe");
    
        if (this.field)
            return this.field.probe(probe);
    }
}