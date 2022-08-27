import { Particle, Physics } from './physics.js';
//import { scenarios0 as simulationList } from './scenarios0.js';
//import { scenarios1 as simulationList } from './scenarios/scenarios1.js';
//import { fields as simulationList } from './scenarios/fieldTest.js';
import { elements as simulationList } from './scenarios/elements.js';
import { randomColor } from './helpers.js';
import { fieldUpdate, fieldCleanup } from './field.js'

export let particleList = [];
export let physics;

let particlesSetup = simulationList[0];
const enableMassRadius = true;
let enableChargeColor = true;
let cicles = 0;
let energy = 0.0;
let particleRadius = 20;
let particleRadiusRange = particleRadius / 2;
let totalMass = 0.0;

let maxDistance = 1e6;
const barrier = new Particle();
barrier.mass = 1e100;

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
}

export function setBoundaryDistance(d = 1e6) {
    maxDistance = d;
}

function drawParticles(graphics) {
    let minRadius = particleRadius - particleRadiusRange / 2;
    let maxRadius = particleRadius + particleRadiusRange / 2;
    let mMin = Infinity, mMax = -Infinity;
    let qMin = Infinity, qMax = -Infinity;
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
    });
    const absMass = Math.max(Math.abs(mMin), Math.abs(mMax));
    const absCharge = Math.max(Math.abs(qMin), Math.abs(qMax));

    particleList.forEach((p, i) => {
        let radius = minRadius;
        if (enableMassRadius) {
            radius += Math.round((maxRadius - minRadius) * Math.abs(p.mass) / absMass);
        }

        let color;
        if (enableChargeColor) {
            color = generateParticleColor(p, absCharge);
        } else {
            color = randomColor();
        }

        graphics.addParticle(p, radius, color);
        graphics.render(p);
    });
}

export function simulationSetup(graphics, idx) {
    simulationCleanup(graphics);
    fieldCleanup(graphics);

    if (idx >= 0 && idx < simulationList.length) {
        particlesSetup = simulationList[idx];
    }

    physics = new Physics();
    graphics.cameraDefault();
    particlesSetup(graphics, physics);
    drawParticles(graphics);
    fieldUpdate();
    graphics.cameraSetup();
}

function boundaryCheck(p1) {
    if (p1.position.length() > maxDistance) {
        physics.colide(p1, barrier);
        physics.update(p1);
    }
}

export function simulationStep(graphics) {
    energy = 0.0;
    for (let i = 0; i < particleList.length; ++i) {
        let p1 = particleList[i];
        for (let j = i + 1; j < particleList.length; ++j) {
            let p2 = particleList[j];
            physics.interact(p1, p2);
        }
        physics.update(p1);

        boundaryCheck(p1);

        graphics.render(p1);
        energy += (p1.mass * p1.velocity.lengthSq());
    }
    ++cicles;

    fieldUpdate();
}

function simulationCleanup(graphics) {
    particleList.forEach((p, i) => {
        graphics.scene.remove(p.sphere);
    });
    particleList = [];
    cicles = 0;
    particleRadius = 20;
    particleRadiusRange = particleRadius / 2;

    maxDistance = 1e6;
    totalMass = 0.0;
    energy = 0.0;
}

export function simulationState() {
    let particles = particleList.length;
    return [
        particlesSetup.name,
        particles,
        cicles,
        (energy / particles).toFixed(2),
        physics.colisionCounter,
        totalMass,
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
    let r = 0, g = 0, b = 0;
    const min = 30;
    const max = 255;

    let charge = p.charge;
    if (charge > 0) {
        b = Math.round(min + (max - min) * Math.abs(charge) / absCharge);
    } else if (charge < 0) {
        r = Math.round(min + (max - min) * Math.abs(charge) / absCharge);
    } else {
        r = g = b = 255;
    }

    if (p.nearCharge > 0) {
        g = 50;
    } else if (p.nearCharge < 0) {
        g = 200;
    }

    return "rgb(" + r + "," + g + "," + b + ")";
}
