import { Physics } from './physics.js';
import { randomColor, generateParticleColor } from './helpers.js';
import { fieldUpdate, fieldCleanup } from './field.js';

let particlesSetup = undefined;
const enableMassRadius = true;
let enableChargeColor = true;
let cicles = 0;
let energy = 0.0;
let particleRadius = 20;
let particleRadiusRange = particleRadius / 2;
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

function addParticles(graphics, particleList) {
    let minRadius = particleRadius - particleRadiusRange / 2;
    let maxRadius = particleRadius + particleRadiusRange / 2;
    const absMass = Math.max(Math.abs(mMin), Math.abs(mMax));
    particleList.forEach((p, i) => {
        let radius = minRadius;
        if (enableMassRadius && absMass != 0) {
            radius += Math.round((maxRadius - minRadius) * Math.abs(p.mass) / absMass);
        }
        graphics.addParticle(p, radius);
        graphics.render(p);
    });
}

function drawParticles(graphics, particleList) {
    mMin = Infinity, mMax = -Infinity;
    qMin = Infinity, qMax = -Infinity;
    particleList.forEach((p, idx) => {
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

    addParticles(graphics, particleList);
    paintParticles(particleList);
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
    constructor(graphics, physics, particleList) {
        log("constructor");

        this.graphics = graphics;
        this.physics = physics;
        this.particleList = particleList

        this.populateSimulationCallback = undefined;

        this.cleanup();
    }

    setup(populateSimulationCallback) {
        log("setup");

        this.populateSimulationCallback = populateSimulationCallback;

        console.log("simulationSetup ----------");

        this.cleanup();
        fieldCleanup(this.graphics);
        this.graphics.cameraDefault();

        particlesSetup = populateSimulationCallback;

        this.physics = new Physics();

        console.log("particleSetup ----------");
        particlesSetup(this.graphics, this.physics);
        console.log("particleSetup done ----------");

        this.graphics.cameraSetup();
        drawParticles(this.graphics, this.particleList);
        fieldUpdate();

        console.log("simulationSetup done ----------");
    }

    cleanup() {
        log("cleanup");

        this.particleList.forEach((p, i) => {
            this.graphics.scene.remove(p.mesh);
        });
    
        while (this.particleList.length > 0) {
            this.particleList.pop();
        }
    
        cicles = 0;
        particleRadius = 20;
        particleRadiusRange = particleRadius / 2;
    
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
        ++cicles;

        fieldUpdate();

        if (dt < 1e3) totalTime += dt;
    }

    state() {
        let particles = this.particleList.length;
        return [
            particlesSetup.name,
            particles,
            cicles,
            energy / particles,
            this.physics.colisionCounter,
            totalMass,
            maxDistance,
            totalTime,
            totalCharge,
        ];
    }

    exportCsv() {
        let output = this.particleList[0].header() + "\n";
        this.particleList.forEach((p, i) => {
            output += p.csv() + "\n";
        });
        output += this.physics.header() + "\n" + this.physics.csv() + "\n";
        output += "cicles\n";
        output += cicles + "\n";
        return output;
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
}