import { Particle, Physics } from './physics.js';
//import { scenarios0 as simulationList } from './scenarios0.js';
//import { scenarios1 as simulationList } from './scenarios/scenarios1.js';
import { fields as simulationList } from './scenarios/fields.js';
import { randomColor } from './helpers.js';
import { ArrowHelper, Vector3 } from 'three';

let simulation = simulationList[0];
let enableMassRadius = true;
let enableChargeColor = true;
let physics;
let cicles = 0;
let energy = 0.0;

export let particleList = [];
let particleRadius = 20;
let particleRadiusRange = particleRadius / 2;

export function setParticleRadius(radius, range) {
    particleRadius = radius;
    particleRadiusRange = range;
}

export function toogleChargeColor() {
    enableChargeColor = !enableChargeColor;
}

function sceneSetup(graphics) {
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

    if (idx >= 0 && idx < simulationList.length) {
        simulation = simulationList[idx];
    }

    physics = new Physics();
    graphics.cameraDefault();
    simulation(graphics, physics);
    sceneSetup(graphics);
    fieldSetup(graphics);
    graphics.cameraSetup();
}

let maxDistance = 1e6;
const barrier = new Particle();
barrier.mass = 1e100;

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

    fieldUpdate(0, 1, 0);
}

function simulationCleanup(graphics) {
    particleList.forEach((p, i) => {
        graphics.scene.remove(p.sphere);
    });
    particleList = [];
    cicles = 0;
    particleRadius = 20;
    particleRadiusRange = particleRadius / 2;
}

export function simulationState() {
    let particles = particleList.length;
    return [
        simulation.name,
        particles,
        cicles,
        (energy / particles).toFixed(2),
        physics.colisionCounter,
    ];
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

let fieldVectorList = [];
const arrows = Math.pow(16, 3);
let gridSize0 = Math.round(Math.pow(arrows, 1 / 3));
let gridSpacing = 5;

export function fieldConfig(size = 10, spacing = 5) {
    gridSize0 = size;
    gridSpacing = spacing;
}

export function fieldAdd(graphics, gridSize = [gridSize0, gridSize0, gridSize0], center = new Vector3()) {
    for (let x = 0; x < gridSize[0]; x++) {
        let xPos = (x - gridSize[0] / 2 + 0.5) * gridSpacing;
        for (let y = 0; y < gridSize[1]; y++) {
            let yPos = (y - gridSize[1] / 2 + 0.5) * gridSpacing;
            for (let z = 0; z < gridSize[2]; z++) {
                let zPos = (z - gridSize[2] / 2 + 0.5) * gridSpacing;
                let pos = new Vector3(xPos, yPos, zPos).add(center);
                fieldVectorList.push(pos);
                pos.arrow = new ArrowHelper(
                    new Vector3(1, 0, 0),
                    pos,
                    0,
                    0xffffff
                );
                graphics.scene.add(pos.arrow);
            }
        }
    }
}

function fieldSetup(graphics, gridSize = [gridSize0, gridSize0, gridSize0], center = new Vector3()) {
    fieldCleanup(graphics);
    fieldAdd(graphics, gridSize, center);
}

function fieldCleanup(graphics) {
    fieldVectorList.forEach((pos) => {
        graphics.scene.remove(pos.arrow);
    });
    fieldVectorList = [];

    gridSize0 = Math.round(Math.pow(arrows, 1 / 3));
    gridSpacing = 5;
}

function fieldUpdate(m, q, nq) {
    let probe = new Particle();
    probe.mass = m;
    probe.charge = q;
    probe.nearCharge = nq;
    fieldVectorList.forEach((pos) => {
        probe.position = pos;
        let dir = fieldProbe(probe);
        let len = dir.length();
        const minLen = 0.5;
        const maxLen = gridSpacing;
        if (len > maxLen) len = maxLen;
        else if (len < minLen) len = minLen;
        dir.normalize();
        pos.arrow.setDirection(dir);
        pos.arrow.setLength(len);
    });
}

export function fieldProbe(probe) {
    probe.force.setScalar(0);

    particleList.forEach((p, idx) => {
        physics.interact(probe, p, true);
        p.force.setScalar(0);
    });

    // let ret = probe.force.clone();
    // probe.force.setScalar(0);

    return probe.force;
}
