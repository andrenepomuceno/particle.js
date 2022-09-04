
import { Vector3 } from 'three';
import { createParticle, bidimensionalMode } from './helpers';
import { setParticleRadius, setBoundaryDistance } from '../simulation';
import { fieldSetup, fieldProbeConfig } from '../field';

export const nearForce = [
    sameCharge,
    opositeCharge,
];

function defaultParameters(graphics, physics, cameraDistance = 5000) {
    let mode2d = true;
    bidimensionalMode(mode2d);

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();
    //if (mode2d) graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 0;
    physics.chargeConstant = 0;//1 / 60;
    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e3;

    setParticleRadius(30, 10);
    setBoundaryDistance(1e5);

    if (mode2d) fieldSetup(graphics, "2d", 70);
    if (!mode2d) fieldSetup(graphics, "3d", 16);

    //fieldProbeConfig(1e3, 0, 0);
    //fieldProbeConfig(0, 1e6, 0);
    fieldProbeConfig(0, 0, 100);
}

function sameCharge(graphics, physics) {
    defaultParameters(graphics, physics);

    let m = 1;
    let q = 0;
    let nq = 1;
    let r = physics.nearChargeRange * 1;
    let v = 10;

    let pos = new Vector3(r, 0, 0);
    let vel = new Vector3(-v, 0, 0);

    createParticle(m, q, nq, pos, vel);

    pos.multiplyScalar(-1);
    vel.multiplyScalar(-1);

    createParticle(m, q, nq, pos, vel);
}

function opositeCharge(graphics, physics) {
    defaultParameters(graphics, physics);

    let m = 1;
    let q = 0;
    let nq = 1;
    let r = physics.nearChargeRange * 1;
    let v = 10;

    let pos = new Vector3(r, 0, 0);
    let vel = new Vector3(-v, 0, 0);

    createParticle(m, q, nq, pos, vel);

    pos.multiplyScalar(-1);
    vel.multiplyScalar(-1);

    createParticle(m, q, -nq, pos, vel);
}