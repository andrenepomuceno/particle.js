
import { Vector3 } from 'three';
import { fieldCleanup, fieldProbe, fieldProbeConfig, fieldSetup } from '../field.js';
import { setParticleRadius, setBoundaryDistance } from '../simulation.js'
import { createCloud0, createNuclei0, atom0, bidimensionalMode } from './helpers.js';

export const elements = [
    //water,
    hydrogen,
    helium,
    lithium,
    carbon,
    nitrogen,
    oxigen,
];

function defaultParameters(graphics, physics, cameraDistance = 5000) {
    let mode2d = true;
    bidimensionalMode(mode2d);

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    //if (mode2d) graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 8;
    physics.massConstant = 1e-6;
    physics.nearChargeConstant = -1;
    physics.nearChargeRange = 200;
    physics.chargeConstant = Math.abs(physics.nearChargeConstant) / 60;

    setParticleRadius(30, 10);
    setBoundaryDistance(1e4);

    if (mode2d) {
        let grid = 51;
        let spacing = 4 * window.innerWidth / grid * (cameraDistance / 5000);
        let ratio = window.innerWidth / window.innerHeight;
        let gridArray = [
            grid,
            Math.round(grid / ratio),
            1
        ];
        fieldSetup(graphics, spacing, gridArray);
    }

    //fieldProbeConfig(1e3, 0, 0);
    fieldProbeConfig(0, 1e7, 0);
    //fieldProbeConfig(0, 0, 1);
}

function atom(physics, n, center = new Vector3()) {
    let m = 1 / 100;
    let q = 50;
    let nq = 1;

    let r0 = physics.nearChargeRange / 2;
    let r1 = 2 * r0;
    let r2 = r1 * (n + 1) * 4;

    //let v = 20*Math.sqrt(q/r1);
    let v = 15;
    //console.log(v);

    let ne = 16 * n;
    atom0(
        n, ne,
        m, q, nq,
        r0, r1, r2,
        v,
        center
    );
}

function water(graphics, physics) {
    defaultParameters(graphics, physics, 5000);
    //fieldCleanup(graphics);
    // physics.nearChargeConstant = 60;
    // physics.nearChargeRange = 512;
    let x = physics.nearChargeRange * 1.5;
    let y = x / 2;
    atom(physics, 1, new Vector3(-x, -y, 0));
    atom(physics, 8, new Vector3(0, y, 0));
    atom(physics, 1, new Vector3(x, -y, 0));

    //createCloud0(64, 1 / 4, -1e2, 0, 0, 5e3, 1);
}

function hydrogen(graphics, physics) {
    defaultParameters(graphics, physics, 3000);
    atom(physics, 1);
}

function helium(graphics, physics) {
    defaultParameters(graphics, physics, 3000);
    atom(physics, 2);
}

function lithium(graphics, physics) {
    defaultParameters(graphics, physics, 3000);
    atom(physics, 3);
}

function carbon(graphics, physics) {
    defaultParameters(graphics, physics, 5000);
    atom(physics, 6);
}

function nitrogen(graphics, physics) {
    defaultParameters(graphics, physics, 5000);
    atom(physics, 7);
}

function oxigen(graphics, physics) {
    defaultParameters(graphics, physics, 5000);
    atom(physics, 8);
}

