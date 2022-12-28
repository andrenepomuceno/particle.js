
import { Vector3 } from 'three';
import { createParticle, createParticlesList, randomVector } from './helpers';
import { cubeGenerator, random } from '../helpers';
import { randomSphericVector } from '../helpers';

export const nuclearForce = [
    crystal,
    //randomBlob,
    molecule,
    //oppositChargeBall,
    //sameChargeBall,
    //oppositeCharge,
    //sameCharge,
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

    physics.forceConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1 / 60;
    physics.nuclearForceConstant = 1;
    physics.nuclearForceRange = 1e3;

    simulation.setParticleRadius(20, 10);
    simulation.physics.boundaryDistance = 1e5;

    //simulation.field.probeConfig(0, 0, 100);
    //simulation.field.probeConfig(1e10, 0, 0);
    //simulation.field.probeConfig(0, 1e9, 0);

    if (mode2d) simulation.fieldSetup("2d", 70);
    if (!mode2d) simulation.fieldSetup("3d", 16);
}

function crystal(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 15e3);
    ;
    simulation.setParticleRadius(50, 10);

    let m = 1 / 10;
    let q = 10;
    let nq = 1;
    let grid = [23, 23, 1];
    let r0 = physics.nuclearForceRange * 1 / 100;
    let r1 = physics.nuclearForceRange * 0.639;
    let v = 0;
    let n = 2;

    let aux = 0;
    cubeGenerator((x, y, z) => {
        createParticlesList(physics.particleList, n,
            (i) => {
                return m;
            },
            (i) => {
                return (i % 2 == 0) ? (q) : (-q);
                //return random(0, 1, true) ? (-q) : (q);
            },
            (i) => {
                if (aux % 2 == 0) {
                    return nq;
                } else {
                    return -nq;
                }
            },
            (i) => {
                return randomSphericVector(0, r0).add(new Vector3(x, y, z), simulation.mode2D);
            },
            (i) => {
                return randomVector(v, simulation.mode2D);
            }
        );
        ++aux;
    }, grid[0] * r1, grid);
}

function randomBlob(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 10e3);
    ;
    simulation.setParticleRadius(50, 10);

    let m = 1 / 10;
    let q = 1;
    let nq = 1;
    let r0 = physics.nuclearForceRange * 0;
    let r1 = physics.nuclearForceRange * 3;
    let v = 0;
    let n = 1200;

    let pos = new Vector3(r1, 0, 0);


    createParticlesList(physics.particleList, n,
        (i) => {
            return m;
            //return m * random(0, 3, true);
        },
        (i) => {
            return random(0, 1, true) ? (-q) : (q);
            //return q * random(-1, 1, true);
        },
        (i) => {
            return random(0, 1, true) ? (-nq) : (nq);
            //return nq * random(-1, 1, true);
        },
        (i) => {
            //let x = randomSphericVector(r0, r1, simulation.mode2D);
            let x = randomVector(r1, simulation.mode2D);
            //(i % 2 == 0) ? (x.add(pos)) : (x.sub(pos));
            return x;
        },
        (i) => {
            // let vel = new Vector3(v, 0, 0);
            // (i % 2 == 0) ? (vel.multiplyScalar(-1)) : (0);
            // return vel;
            return randomVector(v, simulation.mode2D);
        }
    )
}

function molecule(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 5e3);
    //;

    let m = 1;
    let q = 32;
    let nq = 1;
    let r0 = physics.nuclearForceRange / 100;
    let r1 = physics.nuclearForceRange * 0.35;
    let v = 0;
    let n = 2;

    let pos = new Vector3(r1, 0, 0);
    let vel = new Vector3(-v, 0, 0);

    createParticlesList(physics.particleList, n,
        (i) => {
            //return m; 
            return (i % 2) ? (1000 * m) : (m);
        },
        (i) => {
            //return q;
            return (i % 2) ? (q) : (-q);
            //return random(0, 1, true) ? (-q) : (q);
        },
        (i) => {
            //return (i % 2) ? (nq) : (-nq);
            //return random(0, 1, true) ? (-nq) : (nq);
            return nq;
        },
        () => {
            return randomSphericVector(0, r0).add(pos, simulation.mode2D);
            //return randomVector(r, simulation.mode2D);
        },
        () => { return vel; }
    )

    vel.multiplyScalar(-1);
    createParticlesList(physics.particleList, n,
        (i) => {
            //return m; 
            return (i % 2) ? (1000 * m) : (m);
        },
        (i) => {
            //return q;
            return (i % 2) ? (q) : (-q);
            //return random(0, 1, true) ? (-q) : (q);
        },
        (i) => {
            //return (i % 2) ? (nq) : (-nq);
            //return random(0, 1, true) ? (-nq) : (nq);
            return -nq;
        },
        () => {
            return randomSphericVector(0, r0).sub(pos, simulation.mode2D);
            //return randomVector(r, simulation.mode2D);
        },
        () => { return vel; }
    )
}

function oppositChargeBall(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 10e3);
    ;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r = physics.nuclearForceRange * 3.0;
    let v = 0;
    let n = 1200;

    let pos = new Vector3(r, 0, 0);
    let vel = new Vector3(-v, 0, 0);

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r, simulation.mode2D);
            //return randomVector(r, simulation.mode2D);
        },
        () => { return vel; }
    )
}

function sameChargeBall(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);
    ;

    let m = 1;
    let q = 0;
    let nq = 1;
    let r = physics.nuclearForceRange * 0.5;
    let v = 0;
    let n = 512;

    let pos = new Vector3(r, 0, 0);
    let vel = new Vector3(-v, 0, 0);

    createParticlesList(physics.particleList, n,
        () => { return m; },
        () => { return q; },
        () => { return nq; },
        () => { return randomSphericVector(0, r, simulation.mode2D); },
        () => { return vel; }
    )
}

function oppositeCharge(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    let m = 1;
    let q = 0;
    let nq = 1;
    let r = physics.nuclearForceRange * 0.49;
    let v = 0;

    let pos = new Vector3(r, 0, 0);
    let vel = new Vector3(-v, 0, 0);

    createParticle(physics.particleList, m, q, nq, pos, vel);

    pos.multiplyScalar(-1);
    vel.multiplyScalar(-1);

    createParticle(physics.particleList, m, q, -nq, pos, vel);
}

function sameCharge(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    let m = 1;
    let q = 0;
    let nq = 1;
    let r = physics.nuclearForceRange * 0.5;
    let v = 0;

    let pos = new Vector3(r, 0, 0);
    let vel = new Vector3(-v, 0, 0);

    createParticle(physics.particleList, m, q, nq, pos, vel);

    pos.multiplyScalar(-1);
    vel.multiplyScalar(-1);

    createParticle(physics.particleList, m, q, nq, pos, vel);
}