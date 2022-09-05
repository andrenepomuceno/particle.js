
import { Vector3 } from 'three';
import { createParticle, bidimensionalMode, createParticles, randomSphericVector, randomVector } from './helpers';
import { setParticleRadius, setBoundaryDistance } from '../simulation';
import { fieldSetup, fieldProbeConfig, fieldCleanup } from '../field';
import { random } from '../helpers';

export const nearForce = [
    oppositChargeBall,
    sameChargeBall,
    oppositeCharge,
    sameCharge,
];

function defaultParameters(graphics, physics, cameraDistance = 5000) {
    let mode2d = true;
    bidimensionalMode(mode2d);

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();
    //if (mode2d) graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1e-9;
    physics.chargeConstant = 1/60;
    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e3;

    setParticleRadius(20, 10);
    setBoundaryDistance(1e5);

    if (mode2d) fieldSetup(graphics, "2d", 70);
    if (!mode2d) fieldSetup(graphics, "3d", 16);

    //fieldProbeConfig(1e3, 0, 0);
    //fieldProbeConfig(0, 1e6, 0);
    fieldProbeConfig(0, 0, 100);
}

function oppositChargeBall(graphics, physics) {
    defaultParameters(graphics, physics, 10e3);
    fieldCleanup(graphics);

    let m = 1;
    let q = 1;
    let nq = 1;
    let r = physics.nearChargeRange * 3.0;
    let v = 0;
    let n = 1200;

    let pos = new Vector3(r, 0, 0);
    let vel = new Vector3(-v, 0, 0);

    createParticles(n,
        () => { return m; },
        (i) => {
            //return q;
            //return (i % 2) ? (q) : (-q);
            return random(0, 1, true) ? (-q) : (q);
        },
        (i) => {
            //return (i % 2) ? (nq) : (-nq);
            return random(0, 1, true) ? (-nq) : (nq);
        },
        () => {
            return randomSphericVector(0, r);
            //return randomVector(r);
        },
        () => { return vel; }
    )
}

function sameChargeBall(graphics, physics) {
    defaultParameters(graphics, physics);
    fieldCleanup(graphics);

    let m = 1;
    let q = 0;
    let nq = 1;
    let r = physics.nearChargeRange * 0.5;
    let v = 0;
    let n = 512;

    let pos = new Vector3(r, 0, 0);
    let vel = new Vector3(-v, 0, 0);

    createParticles(n,
        () => { return m; },
        () => { return q; },
        () => { return nq; },
        () => { return randomSphericVector(0, r); },
        () => { return vel; }
    )
}

function oppositeCharge(graphics, physics) {
    defaultParameters(graphics, physics);

    let m = 1;
    let q = 0;
    let nq = 1;
    let r = physics.nearChargeRange * 0.49;
    let v = 0;

    let pos = new Vector3(r, 0, 0);
    let vel = new Vector3(-v, 0, 0);

    createParticle(m, q, nq, pos, vel);

    pos.multiplyScalar(-1);
    vel.multiplyScalar(-1);

    createParticle(m, q, -nq, pos, vel);
}

function sameCharge(graphics, physics) {
    defaultParameters(graphics, physics);

    let m = 1;
    let q = 0;
    let nq = 1;
    let r = physics.nearChargeRange * 0.5;
    let v = 0;

    let pos = new Vector3(r, 0, 0);
    let vel = new Vector3(-v, 0, 0);

    createParticle(m, q, nq, pos, vel);

    pos.multiplyScalar(-1);
    vel.multiplyScalar(-1);

    createParticle(m, q, nq, pos, vel);
}