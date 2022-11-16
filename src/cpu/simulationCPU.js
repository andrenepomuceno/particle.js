import { Scene } from 'three';
import { randomColor, generateParticleColor } from './../helpers.js';
import { fieldUpdate, fieldCleanup } from './../simulation';

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

    setup(populateSimulationCallback) {
        log("setup");

        this.populateSimulationCallback = populateSimulationCallback;
        this.name = populateSimulationCallback.name;

        console.log("simulationSetup ----------");

        this.cleanup();
        fieldCleanup(this.graphics);
        this.graphics.cameraDefault();

        particlesSetup = populateSimulationCallback;

        console.log("particleSetup ----------");
        particlesSetup(this.graphics, this.physics);
        console.log("particleSetup done ----------");

        this.graphics.cameraSetup();
        this.#drawParticles();
        fieldUpdate();

        console.log("simulationSetup done ----------");
    }

    cleanup() {
        log("cleanup");

        /*this.particleList.forEach((p, i) => {
            this.graphics.scene.remove(p.mesh);
        });*/

        this.name = "untitled";

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

        fieldUpdate();

        if (dt < 1e3) totalTime += dt;
    }

    state() {
        let particles = this.particleList.length;
        return [
            this.name,
            particles,
            cycles,
            energy / particles,
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

            totalMass += p.mass;
            energy += (p.mass * p.velocity.lengthSq());
            totalCharge += p.charge;
        });

        this.#addParticles();
        paintParticles(this.particleList);
    }

    #addParticles() {
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
}