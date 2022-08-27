
import { Vector3 } from 'three';
import { fieldProbe, fieldProbeConfig, fieldSetup } from '../field.js';
import { setParticleRadius, setBoundaryDistance } from '../simulation.js'
import { createCloud0, createNuclei0, atom0, bidimensionalMode } from './helpers.js';

export const elements = [
    hydrogen,
    helium,
    lithium,
    carbon,
    nitrogen,
    oxigen,
];

function defaultParameters(graphics, physics, camera = 5000) {
    graphics.cameraDistance = camera;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nearChargeConstant = -60;
    physics.nearChargeRange = 256;

    setParticleRadius(30, 10);
    setBoundaryDistance(100e3);

    let grid = 100;
    let spacing = Math.round(44*(camera/3000));
    fieldSetup(graphics, spacing, [grid, Math.round(grid * 9 / 16), 1]);
    let amp = 1e4;
    fieldProbeConfig(0, amp, 0);
}

function atom(physics, n) {
    let r0 = physics.nearChargeRange / 2;
    let r1 = 3 * r0;
    let q = 2e2;
    let v = 10 * Math.sqrt(n);
    let r2 = r1 * Math.sqrt(n);
    let ne = 1*n;
    atom0(
        n, ne,
        1, q, 1,
        r0, r1, r2,
        v
    );
}

function hydrogen(graphics, physics) {
    defaultParameters(graphics, physics, 3000);
    atom(physics,1);
}

function helium(graphics, physics) {
    defaultParameters(graphics, physics, 3000);
    atom(physics,2);
}

function lithium(graphics, physics) {
    defaultParameters(graphics, physics, 3000);
    atom(physics,3);
}

function carbon(graphics, physics) {
    defaultParameters(graphics, physics, 5000);
    atom(physics,6);
}

function nitrogen(graphics, physics) {
    defaultParameters(graphics, physics, 5000);
    atom(physics,7);
}

function oxigen(graphics, physics) {
    defaultParameters(graphics, physics, 5000);
    atom(physics,8);
}

