import { Vector3 } from 'three';
import { createParticle, bidimensionalMode, createParticles, randomSphericVector, randomVector } from './helpers';
import { setParticleRadius, setBoundaryDistance } from '../simulation';
import { fieldSetup, fieldProbeConfig, fieldCleanup } from '../field';
import { cubeGenerator, random, sphereGenerator } from '../helpers';

export const scenarios2 = [
    gravityTest,
];

function defaultParameters(graphics, physics, cameraDistance = 5000) {
    bidimensionalMode(true);

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.forceConstant = 1.0;
    physics.massConstant = 1.0;
    physics.chargeConstant = 1.0;
    physics.nearChargeConstant = 1.0;
    physics.nearChargeRange = 1e3;

    setParticleRadius(20, 10);
    setBoundaryDistance(1e6);
}

function gravityTest(graphics, physics) {
    defaultParameters(graphics, physics, 10e3);
    setParticleRadius(50, 10);
    bidimensionalMode(true);

    let n = 1;
    let m = 1e3;
    let q = 0;
    let nq = 0;
    let r0 = 1e3;
    let v = 0;

    
}