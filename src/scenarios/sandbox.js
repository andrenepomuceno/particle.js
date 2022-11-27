import { Vector3 } from 'three';
import { createParticle, createParticles, randomSphericVector, randomVector, createNuclei } from './helpers';
import { random, hexagonGenerator, shuffleArray, cubeGenerator } from '../helpers';

export const sandbox = [
    sandbox0,
];

function defaultParameters(simulation, cameraDistance = 1e4) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    simulation.fieldCleanup();

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1 / 60;
    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 5e2;

    physics.boundaryDistance = 1e6;
    physics.boundaryDamping = 0.9;

    simulation.setParticleRadius(50, 25);
    simulation.bidimensionalMode(true);
}

function sandbox0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);
}