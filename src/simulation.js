import { Particle, Physics } from './physics.js';
import { scenarios0 } from './scenarios/scenarios0.js';
import { scenarios1 } from './scenarios/scenarios1.js';
import { fields } from './scenarios/fieldTest.js';
import { elements } from './scenarios/elements.js';
import { randomColor } from './helpers.js';
import { fieldUpdate, fieldCleanup } from './field.js'

function initialSimulation(list, name) {
    return list.find(e => {
        if (e.name == name) return e;
        else return list[0];
    });
}
let simulationList = [];
//simulationList.push(initialSimulation(fields, ""));
simulationList = simulationList.concat(elements);
simulationList = simulationList.concat(fields);
simulationList = simulationList.concat(scenarios1);
simulationList = simulationList.concat(scenarios0);
let particlesSetup = simulationList[0];
console.log(particlesSetup);

export let particleList = [];
export let physics;

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
    maxDistance = d;
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
        if (enableMassRadius) {
            radius += Math.round((maxRadius - minRadius) * Math.abs(p.mass) / absMass);
        }
        graphics.addParticle(p, radius);
        graphics.render(p);
    });
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
    });

    addParticles(graphics);
    paintParticles();
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
    graphics.cameraSetup();
    fieldUpdate();
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
        energy += p1.energy();
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
        maxDistance,
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
        h = 128;
        l = 60;
    }

    if (p.nearCharge > 0) {
        h -= 22;
    } else if (p.nearCharge < 0) {
        h += 22;
    }

    while (h > 360) h -= 360;
    while (h < 0) h += 360;

    return "hsl(" + h + "," + s + "%," + l + "%)";
}
