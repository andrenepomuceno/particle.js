import { Particle, Physics } from './physics.js';
import { randomColor } from './helpers.js';
import { fieldUpdate, fieldCleanup } from './field.js';
import { scenarios0 } from './scenarios/scenarios0.js';
import { scenarios1 } from './scenarios/scenarios1.js';
import { fields } from './scenarios/fieldTest.js';
import { elements } from './scenarios/elements.js';
import { nearForce } from './scenarios/nearForce.js';
import { scenarios2 } from './scenarios/scenarios2.js';
import { gpgpu } from './scenarios/gpgpu';

function initialSimulation(list, name) {
    return list.find(e => {
        return e.name == name;
    });
}
let simulationList = [];
//simulationList = simulationList.concat(gpgpu);
simulationList = simulationList.concat(scenarios2);
simulationList = simulationList.concat(nearForce);
simulationList = simulationList.concat(fields);
simulationList = simulationList.concat(elements);
simulationList = simulationList.concat(scenarios1);
simulationList = simulationList.concat(scenarios0);
let particlesSetup = simulationList[0];

export let particleList = [];
export let physics;

const enableMassRadius = true;
let enableChargeColor = true;
let cicles = 0;
let energy = 0.0;
let particleRadius = 20;
let particleRadiusRange = particleRadius / 2;
let totalMass = 0.0;
let totalTime = 0.0;
let totalCharge = 0.0;

let mMin = Infinity, mMax = -Infinity;
let qMin = Infinity, qMax = -Infinity;

export function setParticleRadius(radius, range) {
    particleRadius = radius;
    particleRadiusRange = range;
}

export function setColorMode(mode) {
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

export function setBoundaryDistance(d = 1e6) {
    physics.boundaryDistance = d;
}

function paintParticles() {
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

function addParticles(graphics) {
    let minRadius = particleRadius - particleRadiusRange / 2;
    let maxRadius = particleRadius + particleRadiusRange / 2;
    const absMass = Math.max(Math.abs(mMin), Math.abs(mMax));
    particleList.forEach((p, i) => {
        let radius = minRadius;
        if (enableMassRadius && absMass != 0) {
            radius += Math.round((maxRadius - minRadius) * Math.abs(p.mass) / absMass);
        }
        p.radius = radius;
        //graphics.addParticle(p);
        //graphics.refreshPosition(p);
    });
    graphics.drawParticles();
}

function drawParticles(graphics) {
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

    paintParticles();
    addParticles(graphics);
}

export function simulationSetup(graphics, idx) {
    console.log("simulationSetup ----------");

    simulationCleanup(graphics);
    fieldCleanup(graphics);
    graphics.cameraDefault();

    if (idx >= 0 && idx < simulationList.length) {
        particlesSetup = simulationList[idx];
    }

    physics = new Physics();

    console.log("particleSetup ----------");
    particlesSetup(graphics, physics);
    console.log("particleSetup done ----------");

    graphics.cameraSetup();
    drawParticles(graphics);
    fieldUpdate();

    console.log("simulationSetup done ----------");
}

export function simulationStep(graphics, dt) {
    energy = 0.0;

    graphics.compute();
    ++cicles;

    fieldUpdate();

    if (dt < 1e3) totalTime += dt;
}

function simulationCleanup(graphics) {
    // particleList.forEach((p, i) => {
    //     graphics.scene.remove(p.mesh);
    // });
    graphics.cleanup();

    particleList = [];
    cicles = 0;
    particleRadius = 20;
    particleRadiusRange = particleRadius / 2;

    totalMass = 0.0;
    energy = 0.0;
    totalTime = 0.0;
}

export function simulationState() {
    let particles = particleList.length;
    return [
        particlesSetup.name,
        particles,
        cicles,
        energy / particles,
        physics.colisionCounter,
        totalMass,
        physics.boundaryDistance,
        totalTime,
        totalCharge,
    ];
}

export function simulationCsv() {
    let output = particleList[0].header() + "\n";
    particleList.forEach((p, i) => {
        output += p.csv() + "\n";
    });
    output += physics.header() + "\n" + physics.csv() + "\n";
    output += "cicles\n";
    output += cicles + "\n";
    return output;
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

    if (p.nearCharge > 0) {
        //h -= 20;
    } else if (p.nearCharge < 0) {
        h += 10;
    }

    while (h > 360) h -= 360;
    while (h < 0) h += 360;

    return "hsl(" + h + "," + s + "%," + l + "%)";
}
