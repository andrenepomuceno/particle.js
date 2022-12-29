import { Vector3 } from 'three';
import { random } from '../helpers.js'
import { Particle, ParticleType } from '../particle';
import { createParticle, randomVector } from './helpers'
import { randomSphericVector } from '../helpers';

let particleList = undefined;

export const scenarios1 = [
    simulationNuclei4,
    simulationNuclei3,
    simulationStrongCube0,
    simulationStrongBlob0,
    //simulationNuclei2,
    simulationNuclei0,
    simulationNuclei1,
    //simulationStrong2,
    //simulationStrong1,
    //simulationStrong0,
    //simulationMove1,
    //simulationMove0,
    simulationBlob0,
    simulationAtom1,
    simulationAtom0,
];

function createParticles__(n, massFunc, chargeFunc, positionFunc, velocityFunc) {
    for (let i = 0; i < n; ++i) {
        createParticle2(massFunc(i, n), chargeFunc(i, n), 0, positionFunc(i, n), velocityFunc(i, n));
    }
}

function createParticle2(mass = 1, charge = 0, nuclearCharge = 0, position = new Vector3(), velocity = new Vector3(), fixed = false) {
    let p = new Particle();
    p.mass = mass;
    p.charge = charge;
    p.nuclearCharge = nuclearCharge;
    p.position.add(position);
    p.velocity.add(velocity);
    if (fixed) p.type = ParticleType.fixed;
    particleList.push(p);
}

function createParticles2(n, massFunc, chargeFunc, nuclearChargeFunc, positionFunc, velocityFunc) {
    for (let i = 0; i < n; ++i) {
        createParticle2(massFunc(i, n), chargeFunc(i, n), nuclearChargeFunc(i, n), positionFunc(i, n), velocityFunc(i, n));
    }
}

function simulationNuclei4(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 5000;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    simulation.setParticleRadius(30, 10);

    physics.forceConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = -60;
    physics.nuclearForceRange = 256;

    let r = physics.nuclearForceRange / 2;
    let v = 0;
    let q = 1e2;
    let nq = 1;
    let n = 8;

    createParticles2(
        n,
        () => { return 1836; },
        () => {
            return q;
        },
        () => {
            return nq;
        },
        () => {
            let vec = randomSphericVector(0, r, simulation.mode2D);
            return vec;
        },
        () => {
            let vec = randomVector(v, simulation.mode2D);
            return vec;
        },
    );
    
    createParticles2(
        n,
        () => { return 1839; },
        () => {
            return 0;
        },
        () => {
            return nq;
        },
        () => {
            let vec = randomSphericVector(0, r, simulation.mode2D);
            return vec;
        },
        () => {
            let vec = randomVector(v, simulation.mode2D);
            return vec;
        },
    );

    v = 30;
    n = 1200 - 2*n;
    createParticles2(n,
        () => { return 1; },
        () => { return -q; },
        (i) => {
            //return (i % 2) ? (0) : (nq);
            //return nq;
            return 0;
        },
        () => {
            let vec = randomSphericVector(2 * r, 10 * r, simulation.mode2D);
            // vec.z = 0;
            return vec;
        },
        () => {
            let vec = randomVector(v, simulation.mode2D);
            //vec.z = 0;
            return vec;
        }
    )
}

function simulationNuclei3(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 20000;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    simulation.setParticleRadius(30, 10);

    physics.forceConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = -60;
    physics.nuclearForceRange = 1e3;

    let r = physics.nuclearForceRange / 2;
    let v = 0;
    let m = 1e2;
    let q = 1e2;
    let nq = 1;
    let n = 128;

    createParticles2(
        n,
        () => { return m; },
        () => {
            return q;
        },
        () => {
            return nq;
        },
        () => {
            let vec = randomSphericVector(0, r, simulation.mode2D);
            return vec;
        },
        () => {
            let vec = randomVector(v, simulation.mode2D);
            return vec;
        },
    );

    v = 50;
    n = 1200 - n;
    createParticles2(n,
        () => { return 1; },
        () => { return -q; },
        (i) => {
            //return (i % 2) ? (0) : (nq);
            //return nq;
            return 0;
        },
        () => {
            let vec = randomSphericVector(2 * r, 10 * r, simulation.mode2D);
            // vec.z = 0;
            return vec;
        },
        () => {
            let vec = randomVector(v, simulation.mode2D);
            //vec.z = 0;
            return vec;
        }
    )
}

function simulationStrongCube0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 20000;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    simulation.setParticleRadius(30, 10);

    physics.forceConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = 60;
    physics.nuclearForceRange = 1e3;

    let r = physics.nuclearForceRange / 2;
    let v = 0;
    let m = 1e2;
    let q = 64;
    let nq = 1;
    let n = 1200;

    let grid = [2, 2, 2];
    let space = [
        6 * physics.nuclearForceRange,
        6 * physics.nuclearForceRange,
        6 * physics.nuclearForceRange
    ];
    n /= (grid[0] * grid[1] * grid[2]);
    for (let i = 0; i < grid[0]; ++i) {
        for (let j = 0; j < grid[1]; ++j) {
            for (let k = 0; k < grid[2]; ++k) {
                let offset = new Vector3(
                    (i - grid[0] / 2 + 0.5) * space[0],
                    (j - grid[1] / 2 + 0.5) * space[1],
                    (k - grid[2] / 2 + 0.5) * space[2]
                );
                createParticles2(
                    n,
                    () => { return m; },
                    () => {
                        //return (offset.x > 0) ? (-q) : (q);
                        return random(0, 1, true) ? (-q) : (q);
                        return q;
                    },
                    () => {
                        //return (i == 0)?(-nq):(nq);
                        return random(0, 1, true) ? (-nq) : (nq);
                        return nq;
                    },
                    () => {
                        let vec = randomSphericVector(0, r).add(offset, simulation.mode2D);
                        //vec.z = 0;
                        return vec;
                    },
                    () => {
                        //if (offset.x > 0) return new Vector3(-v, 0, 0);
                        //else return new Vector3(v, 0, 0);
                        let vec = randomVector(v, simulation.mode2D);
                        //vec.z = 0;
                        return vec;
                    },
                );
            }
        }
    }
}

function simulationStrongBlob0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 10000;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    simulation.setParticleRadius(50, 10);

    physics.forceConstant = 1;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1/137;
    physics.nuclearForceConstant = 1;
    physics.nuclearForceRange = 2e3;

    let r = physics.nuclearForceRange;
    let v = 0;
    let m = 1;
    let q = 50;
    let nq = 1;
    let n = 1100;

    createParticles2(
        n,
        () => { return m; },
        () => {
            return random(0, 1, true) ? (-q) : (q);
            //return q * random(-3, 3, true);
        },
        () => {
            return random(0, 1, true) ? (-nq) : (nq);
        },
        () => {
            let vec = randomSphericVector(0, r, simulation.mode2D);
            //vec.z = 0;
            return vec;
        },
        () => {
            let vec = randomVector(v, simulation.mode2D);
            //vec.z = 0;
            return vec;
        },
    );
}

function simulationNuclei2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 10000;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    simulation.setParticleRadius(100, 50);

    physics.forceConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 5e3;
    physics.nuclearForceConstant = 60;
    physics.nuclearForceRange = 1000;
    2
    let x = physics.nuclearForceRange / 2;
    let center = new Vector3(0, x, 0);
    let v = new Vector3(0, 0, 0);
    let m = 100;
    let q = 1;
    let nq = 1;
    let ve = 6;

    createParticle2(4 * m, 2 * q, -1 * nq, new Vector3(-x, 0, 0).sub(center), new Vector3().add(v)); //up
    createParticle2(9 * m, -1 * q, 1 * nq, new Vector3(0, 0, 0).sub(center), new Vector3().add(v)); //down
    createParticle2(4 * m, 2 * q, -1 * nq, new Vector3(x, 0, 0).sub(center), new Vector3().add(v)); //up

    createParticle2(9 * m, -1 * q, 1 * nq, new Vector3(-x, 0, 0).add(center), new Vector3().sub(v)); //down
    createParticle2(4 * m, 2 * q, -1 * nq, new Vector3(0, 0, 0).add(center), new Vector3().sub(v)); //up
    createParticle2(9 * m, -1 * q, 1 * nq, new Vector3(x, 0, 0).add(center), new Vector3().sub(v)); //down

    createParticle2(1, -3 * q, 0, new Vector3(0, 2000, 0), new Vector3(ve, 0, 0)); //e
}

function simulationNuclei1(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 1000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 0;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = 1;
    physics.nuclearForceRange = 128;

    let m0 = 1;
    let q0 = 1;
    let nq0 = 1;
    let x = physics.nuclearForceRange / 2;
    createParticle2(m0, q0, nq0,
        new Vector3(x, 0, 0));
    createParticle2(m0, q0, nq0,
        new Vector3(-x, 0, 0));

    createParticle2(m0, -q0, -nq0,
        new Vector3(0, x, 0));
    createParticle2(m0, -q0, -nq0,
        new Vector3(0, -x, 0));
}

function simulationNuclei0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 2000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = 64;
    physics.nuclearForceRange = 128;

    let m0 = 1;
    let m1 = 5;
    let q0 = 150;
    let nq0 = 1;
    let x = physics.nuclearForceRange / 3;
    let y = 500;
    let v = 7;

    createParticle2(m1, 0, nq0,
        new Vector3(x, 0, 0));
    createParticle2(m1, q0, -nq0,
        new Vector3(-x, 0, 0));

    createParticle2(m0, -q0, 0,
        new Vector3(0, y, 0),
        new Vector3(v, 0, 0));
}

function createNuclei0(x0 = 128 / 3, position = new Vector3(), velocity = new Vector3()) {
    let m1 = 611;
    let m2 = 614;
    let q1 = 2;
    let q2 = -1;

    createParticle2(m1, q1, -1,
        new Vector3(-x0, 0, 0).add(position),
        velocity);
    createParticle2(m2, q2, 2,
        new Vector3(0, 0, 0).add(position),
        velocity);
    createParticle2(m1, q1, -1,
        new Vector3(x0, 0, 0).add(position),
        velocity);
}

function simulationStrong2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 5000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = 10;
    physics.nuclearForceRange = 128;

    let x0 = physics.nuclearForceRange / 3;
    let x = 1000;
    let y = x;
    let vx = 2;
    let vy = vx;
    createNuclei0(
        x0,
        new Vector3(-x, y, 0),
        new Vector3(vx, -vy, 0)
    );
    createNuclei0(
        x0,
        new Vector3(-x, -y, 0),
        new Vector3(vx, vy, 0)
    );

    let n = 512;
    let r0 = 2048;
    createParticles__(
        n,
        (i) => { return 1; },
        (i) => { return -3; },
        () => {
            let p = randomSphericVector(0, r0, simulation.mode2D);
            return p;
        },
        () => {
            return randomVector(0, simulation.mode2D);
        }
    )
}

function simulationStrong1(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 4000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = Math.pow(80, 2);
    physics.nuclearForceConstant = Math.pow(5, 2);
    physics.nuclearForceRange = 128;

    let x0 = physics.nuclearForceRange / 3;
    let r1 = 256;
    let v1 = 15;

    let m0 = 1;
    let q0 = -3;

    createNuclei0(x0);
    createParticle2(m0, q0, 0,
        new Vector3(0, r1, 0),
        new Vector3(v1, 0, 0));
}

function simulationStrong0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 2000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 0;
    physics.chargeConstant = 0;
    physics.nuclearForceConstant = 1;
    physics.nuclearForceRange = 128;

    let x = physics.nuclearForceRange / 3;
    let v = 0;
    let m = 1;
    let q = 1;
    let sq = 1;

    createParticle2(m, q, sq, new Vector3(x, 0, 0), new Vector3(0, v, 0));
    createParticle2(m, -q, -sq, new Vector3(-x, 0, 0), new Vector3(-0, v, 0));
}

function simulationMove1(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 3000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 5e-3;
    physics.chargeConstant = 1e-2;

    let r0 = 32;
    let x = -200;
    let v = 0;
    let n = 512;
    let m = 1;
    let q = 1;

    createParticles__(
        n,
        (i) => { return m; },
        (i) => { return q; },
        () => {
            let p = randomSphericVector(0, r0, simulation.mode2D);
            p.add(new Vector3(x, 0, 0));
            return p;
        },
        () => {
            return new Vector3(v, 0, 0);
        }
    )

    createParticles__(
        n,
        (i) => { return m; },
        (i) => { return -q; },
        () => {
            let p = randomSphericVector(0, r0, simulation.mode2D);
            p.add(new Vector3(-x, 0, 0));
            return p;
        },
        () => {
            return new Vector3(-v, 0, 0);
        }
    )
}

function simulationMove0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 3000;
    //graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 5e-2;
    physics.chargeConstant = 1;

    let x = -1000;
    let v = 5;
    let m = 1e3;
    let q = 1;
    createParticle(physics.particleList, m, q, 0, new Vector3(x, 0, 0), new Vector3(v, 0, 0));

    let r0 = 32;
    let v0 = 0;
    createParticles__(
        1000,
        (i) => { return 1; },
        (i) => { return -q; },
        () => { return randomSphericVector(0, r0, simulation.mode2D); },
        () => { return randomVector(v0, simulation.mode2D); }
    )
}

function simulationBlob0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 4000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 10;
    physics.massConstant = 1;
    physics.chargeConstant = 7;

    let r0 = 128;
    let v0 = 3;
    createParticles__(
        1024,
        (i) => { return 1; },
        (i) => { return random(-1, 1, true); },
        () => { return randomSphericVector(0, r0, simulation.mode2D); },
        () => { return randomVector(v0, simulation.mode2D); }
    )
}

function simulationAtom1(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 3000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1e2;
    physics.nuclearForceConstant = 1e2;
    physics.nuclearForceRange = 128;

    let r0 = 64;
    let v0 = 1;
    createParticles2(
        64,
        (i) => { return (i % 2) ? (1839) : (1836); },
        (i) => { return (i % 2) ? (0) : (1); },
        (i) => { return (i % 2) ? (-1) : (1); },
        () => { return randomSphericVector(0, r0, simulation.mode2D); },
        () => { return randomVector(v0, simulation.mode2D); }
    )

    let r1 = 1e3;
    let v1 = 1;
    createParticles__(
        1000,
        () => { return 1; },
        () => { return -1; },
        () => { return randomSphericVector(r0, r1, simulation.mode2D); },
        () => { return randomVector(v1, simulation.mode2D); }
    );
}

function simulationAtom0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    particleList = physics.particleList;

    graphics.cameraDistance = 1000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1e-2;
    physics.chargeConstant = 1;

    createParticle(physics.particleList, 1836, 1);

    let v0 = 1;
    let r0 = 1e3;
    let n = 1e3;
    createParticles__(
        n,
        () => { return 1; },
        () => { return -1; },
        () => { return randomSphericVector(0, r0, simulation.mode2D); },
        () => { return randomVector(v0, simulation.mode2D); }
    );
}
