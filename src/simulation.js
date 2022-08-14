import * as $ from 'jquery';
import { Vector3 } from 'three';
import { Physics } from './physics.js'
import {
    simulation0,
    simulation1,
    simulationAtom,
    simulationCross,
    simulationGrid2D,
    simulationGrid3D,
    simulationSpheres,
    colisionTest
} from './scenarios.js';
import { randomColor } from './helpers.js';

export let physics;
export let particleList = [];

let simulation = simulationAtom;
const enableMassRadius = true;
let enableChargeColor = true;
let cicles = 0;
let colisions = 0;

export function toogleChargeColor() {
    enableChargeColor = !enableChargeColor;
}

export function simulationSetup(graphics, idx) {
    switch (idx) {
        case 1:
            simulation = simulationCross;
            break;
        case 5:
            simulation = simulation0;
            break;
        case 2:
            simulation = simulation1;
            break;
        case 3:
            simulation = simulationGrid2D;
            break;
        case 4:
            simulation = simulationGrid3D;
            break;
        case 6:
            simulation = simulationSpheres;
            break;
        case 0:
            simulation = simulationAtom;
            break;
        case 99:
            simulation = colisionTest;
            break;
        default:
            break;
    }

    physics = new Physics();
    graphics.cameraDefault();
    simulation(graphics);
    sceneSetup(graphics);
    graphics.cameraSetup();
}

function sceneSetup(graphics) {
    particleList.forEach((p, i) => {
        let radius = 5;
        let massRange = physics.massRange;
        let chargeRange = physics.chargeRange;
        if (enableMassRadius) {
            const absMass = Math.abs(Math.max(massRange[0], massRange[1]));
            radius += Math.round(10 * Math.abs(p.mass) / absMass);
        }
        graphics.addToScene(p, radius);

        let color;
        if (enableChargeColor) {
            const absCharge = Math.abs(Math.max(chargeRange[0], chargeRange[1]));
            color = generateParticleColor(p, absCharge);
        } else {
            color = randomColor();
        }
        p.sphere.material.color.set(color);

        if (physics.quantizedPosition) {
            p.position.round();
        }

        graphics.render(p);
    });
}

function generateParticleColor(p, absCharge) {
    let r = 0, g = 0, b = 0;
    const min = 30;
    const max = 255;

    if (p.mass < 0) {
        g = 255;
    }

    if (p.charge > 0) {
        b = Math.round(min + (max - min) * Math.abs(p.charge) / absCharge);
    } else if (p.charge < 0) {
        r = Math.round(min + (max - min) * Math.abs(p.charge) / absCharge);
    } else {
        if (p.mass >= 0) {
            r = g = b = 255;
        } else {
            r = g = b = 127;
        }
    }

    return "rgb(" + r + "," + g + "," + b + ")";
}

export function simulationStep(graphics) {
    let energy = 0.0;
    for (let i = 0; i < particleList.length; ++i) {
        let p1 = particleList[i];
        for (let j = i + 1; j < particleList.length; ++j) {
            let p2 = particleList[j];

            physics.interact(p1, p2);
            if (physics.enableColision && p1.position.equals(p2.position)) {
                physics.colide(p1, p2);
                ++colisions;
            }
        }
        p1.update(physics);
        graphics.render(p1);
        energy += (p1.mass * p1.velocity.lengthSq());
    }
    ++cicles;

    let particles = particleList.length;
    $("#info").html("N: " + particles + "<br>T: " + cicles + "<br>E (avg): " + Math.round(energy / particles) + "<br>C: " + colisions);
}

export function simulationCleanup(graphics) {
    particleList.forEach((p, i) => {
        graphics.scene.remove(p.sphere);
    });
    particleList = [];
    //particleId = 0;
    colisions = 0;
    cicles = 0;
}
