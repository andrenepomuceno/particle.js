
import { Vector3 } from 'three';
import { fieldProbe, fieldProbeConfig, fieldSetup } from '../field.js';
import { setParticleRadius, setBoundaryDistance } from '../simulation.js'
import { createCloud0, createNuclei0, atom0, bidimensionalMode } from './helpers.js';

export const scenarios2 = [
    hydrogen,
    helium,
    lithium,
    carbon,
    oxigen,
];

let q = 1;
let v = 0;
let r0 = 128;
let r1 = 2 * r0;

function defaultParameters(graphics, physics, camera = 5000) {
    graphics.cameraDistance = camera;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nearChargeConstant = -60;
    physics.nearChargeRange = 1e2;

    setParticleRadius(30, 10);
    setBoundaryDistance(10e3);

    q = 100;
    r0 = physics.nearChargeRange / 2;
    r1 = 5 * r0;

    let grid = 100;
    let spacing = 45*(camera/3000);
    fieldSetup(graphics, spacing, [grid, grid * 9 / 16, 1]);
    let amp = 32;
    fieldProbeConfig(amp, amp * q, 0);
}

function hydrogen(graphics, physics) {
    defaultParameters(graphics, physics, 3000);
    let n = 1;
    let v = 10;
    atom0(
        n, 3*n,
        1, q, 1,
        r0, r1, n * r1,
        v
    );
}

function helium(graphics, physics) {
    defaultParameters(graphics, physics, 3000);
    let n = 2;
    let v = 10;
    atom0(
        n, 3*n,
        1, q, 1,
        r0, r1, n * r1,
        v
    );
}

function lithium(graphics, physics) {
    defaultParameters(graphics, physics, 3000);
    let n = 3;
    let v = 10;
    atom0(
        n, 3*n,
        1, q, 1,
        r0, r1, n * r1,
        v
    );
}

function carbon(graphics, physics) {
    defaultParameters(graphics, physics, 5000);
    let n = 6;
    let v = 10;
    atom0(
        n, 3*n,
        1, q, 1,
        r0, r1, n * r1,
        v
    );
}

function oxigen(graphics, physics) {
    defaultParameters(graphics, physics, 5000);
    let n = 8;
    let v = 10;
    atom0(
        n, 3*n,
        1, q, 1,
        r0, r1, n * r1,
        v
    );
}

