import { Physics } from './physics.js';
//import { scenarios0 as simulationList } from './scenarios0.js';
import { scenarios1 as simulationList } from './scenarios1.js';
import { randomColor } from './helpers.js';

export let particleList = [];
let simulation = simulationList[0];
let enableMassRadius = true;
let enableChargeColor = true;
let physics;
let cicles = 0;
let energy = 0.0;

const minRadius = 10;
const maxRadius = 30;

export function toogleChargeColor() {
    enableChargeColor = !enableChargeColor;
}

export function simulationSetup(graphics, idx) {
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

        graphics.addParticle(p, radius);

        physics.update(p);
        p.sphere.material.color.set(color);

        graphics.render(p);
    });
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
        g = 255;
    } else if (p.nearCharge < 0) {
        g = 127;
    }

    return "rgb(" + r + "," + g + "," + b + ")";
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
        graphics.render(p1);
        energy += (p1.mass * p1.velocity.lengthSq());
    }
    ++cicles;
}

export function simulationCleanup(graphics) {
    particleList.forEach((p, i) => {
        graphics.scene.remove(p.sphere);
    });
    particleList = [];
    cicles = 0;
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
