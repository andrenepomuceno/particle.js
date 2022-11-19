
import { Vector3 } from 'three';
import { createCloud0, createNuclei0, atom0, createCloud3 } from './helpers.js';

export const elements = [
    h2,
    hydrogen,
    helium,
    lithium,
    carbon,
    nitrogen,
    oxigen,
    water,
];

function defaultParameters(simulation, cameraDistance = 5000) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    let mode2d = true;
    simulation.bidimensionalMode(mode2d);

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();
    //if (mode2d) graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 8;
    physics.massConstant = 1e-6;
    physics.nearChargeConstant = -1;
    physics.nearChargeRange = 200;
    physics.chargeConstant = Math.abs(physics.nearChargeConstant) / 60;

    simulation.setParticleRadius(30, 10);
    simulation.physics.boundaryDistance = 1e5;

    //simulation.fieldProbeConfig(1e12, 0, 0);
    simulation.fieldProbeConfig(0, 1e6, 0);
    //simulation.fieldProbeConfig(0, 0, 1e2);
    //simulation.fieldProbeConfig(1e10, 1e6, 1e2);

    if (mode2d) simulation.fieldSetup("2d", 70);
    if (!mode2d) simulation.fieldSetup("3d", 16);
}

function atom(physics, n, center = new Vector3()) {
    let m = 1 / 100;
    let q = 100;
    let nq = 1;

    let r0 = physics.nearChargeRange / 2;
    let r1 = 3 * r0;
    let r2 = 2 * r1 * n;

    //let v = 20*Math.sqrt(q/r1);
    let v = 16;
    //console.log(v);

    let ne = 1 * n;
    atom0(
        n, ne,
        m, q, nq,
        r0, r1, r2,
        v,
        center
    );
}

function h2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 5000);

    let m = 1 / 100;
    let q = 100;
    let nq = 1;
    let r0 = physics.nearChargeRange / 2;
    let r1 = 4 * r0;
    let r2 = 2 * r1;
    let x = 2 * r0 * 0.8;
    let v = 16;

    createNuclei0(1, m, q, nq, r0, 0, new Vector3(-x, 0, 0));
    createNuclei0(1, m, q, nq, r0, 0, new Vector3(x, 0, 0));
    createCloud3(8, m, -q, 0, r1, r2, v);
}

function water(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 7000);
    //simulation.fieldCleanup();
    // physics.nearChargeConstant = 60;
    // physics.nearChargeRange = 512;
    let x = physics.nearChargeRange * 1.5;
    let y = x / 2;
    atom(physics, 1, new Vector3(-x, -y, 0));
    atom(physics, 8, new Vector3(0, y, 0));
    atom(physics, 1, new Vector3(x, -y, 0));

    //createCloud0(64, 1 / 4, -1e2, 0, 0, 5e3, 1);
}

function hydrogen(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 3000);
    atom(physics, 1);
}

function helium(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 3000);
    atom(physics, 2);
}

function lithium(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 5000);
    atom(physics, 3);
}

function carbon(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 5000);
    atom(physics, 6);
}

function nitrogen(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 7000);
    atom(physics, 7);
}

function oxigen(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 7000);
    atom(physics, 8);
}

