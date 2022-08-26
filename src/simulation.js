import { Particle, Physics } from './physics.js';
//import { scenarios0 as simulationList } from './scenarios0.js';
import { scenarios1 as simulationList } from './scenarios1.js';
import { randomColor } from './helpers.js';
import { ArrowHelper, Vector3 } from 'three';

export let particleList = [];
let particleRadius = 20;
let particleRadiusRange = particleRadius / 2;

export function setParticleRadius(radius, range) {
    particleRadius = radius;
    particleRadiusRange = range;
}

let simulation = simulationList[0];
let enableMassRadius = true;
let enableChargeColor = true;
let physics;
let cicles = 0;
let energy = 0.0;
let maxDistance = 1e6;
let fieldVectorList = [];

export function toogleChargeColor() {
    enableChargeColor = !enableChargeColor;
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
    graphics.cameraSetup();
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

    fieldSetup(graphics);
}

let arrows = Math.pow(20, 3);
let gridSpacing = 1;

function fieldSetup(graphics) {
    fieldVectorList.forEach((pos, idx) => {
        graphics.scene.remove(pos.arrow);
    });
    fieldVectorList = [];

    let gridSize0 = Math.round(Math.pow(arrows, 1 / 3));
    let gridSize = [gridSize0, gridSize0, gridSize0];
    for (let x = 0; x < gridSize[0]; x++) {
        let xPos = (x - gridSize[0] / 2 + 1) * gridSpacing;
        for (let y = 0; y < gridSize[1]; y++) {
            let yPos = (y - gridSize[1] / 2 + 1) * gridSpacing;
            for (let z = 0; z < gridSize[2]; z++) {
                let zPos = (z - gridSize[2] / 2 + 1) * gridSpacing;
                let pos = new Vector3(xPos, yPos, zPos)
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

function fieldUpdate(m,q,nq) {
    let probe = new Particle();
    probe.mass = q;
    probe.charge = m;
    probe.nearCharge = nq;
    fieldVectorList.forEach((pos, idx) => {
        probe.position = pos;
        let dir = fieldProbe(probe);
        let len = dir.length();
        if (len > gridSpacing) len = gridSpacing;
        dir.normalize();
        pos.arrow.setDirection(dir);
        pos.arrow.setLength(len);
    });
}

let barrier = new Particle();
barrier.mass = 1e100;

export function simulationStep(graphics) {
    energy = 0.0;
    for (let i = 0; i < particleList.length; ++i) {
        let p1 = particleList[i];
        for (let j = i + 1; j < particleList.length; ++j) {
            let p2 = particleList[j];
            physics.interact(p1, p2);
        }
        physics.update(p1);

        if (p1.position.length() > maxDistance) {
            physics.colide(p1, barrier);
            physics.update(p1);
        }

        graphics.render(p1);
        energy += (p1.mass * p1.velocity.lengthSq());
    }
    ++cicles;

    fieldUpdate(0,0,1);
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

export function fieldProbe(probe) {
    probe.force.setScalar(0);

    particleList.forEach((p, idx) => {
        physics.interact(probe, p, true);
        p.force.setScalar(0);
    });

    let ret = probe.force.clone();
    probe.force.setScalar(0);

    return ret;
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
