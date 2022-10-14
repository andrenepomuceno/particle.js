import { Vector3 } from 'three';
import { createParticle, bidimensionalMode, createParticles, randomSphericVector, randomVector } from './helpers';
import { setParticleRadius, setBoundaryDistance } from '../simulation';
import { fieldSetup, fieldProbeConfig, fieldCleanup } from '../field';
import { cubeGenerator, random, sphereGenerator } from '../helpers';

export const gpgpu = [
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
    defaultParameters(graphics, physics, 1e3);
    setParticleRadius(50, 10);
    bidimensionalMode(true);

    physics.massConstant = 0.0;
    physics.chargeConstant = 0.0;
    physics.nearChargeConstant = 0.0;
    physics.nearChargeRange = 1e3;

    let n = 1;
    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 50; //physics.nearChargeRange*0.5;
    let v = 1.0;

    let pos = new Vector3(r0, 0, 0);
    let vel = new Vector3(-v, 0, 0);
    createParticle(m, q, nq, pos, vel);
    createParticle(m, -q, -nq, pos.multiplyScalar(-1), vel.multiplyScalar(-1));
}