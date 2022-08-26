import { Vector3 } from 'three';
import { particleList, setParticleRadius } from './simulation.js'
import { random, randomSpheric } from './helpers.js'
import { Particle } from './physics.js'

export const scenarios1 = [
    simulationNuclei3,
    simulationStrongCube0,
    simulationStrongBlob0,
    simulationNuclei2,
    simulationNuclei0,
    simulationNuclei1,
    simulationStrong2,
    simulationStrong1,
    simulationStrong0,
    simulationMove1,
    simulationMove0,
    simulationBlob0,
    simulationAtom1,
    simulationAtom0,
];

function randomVector(range, round = false) {
    return new Vector3(
        random(-range, range, round),
        random(-range, range, round),
        random(-range, range, round)
    );
}

function randomSphericVector(r1, r2) {
    let [x, y, z] = randomSpheric(r1, r2);
    return new Vector3(x, y, z);
}

function createParticle(mass = 1, charge = 0, position = new Vector3(), velocity = new Vector3(), fixed = false) {
    let p = new Particle();
    p.mass = mass;
    p.charge = charge;
    p.position.add(position);
    p.velocity.add(velocity);
    p.fixed = fixed;
    particleList.push(p);
}

function createParticles(n, massFunc, chargeFunc, positionFunc, velocityFunc) {
    for (let i = 0; i < n; ++i) {
        createParticle(massFunc(i, n), chargeFunc(i, n), positionFunc(i, n), velocityFunc(i, n));
    }
}

function createParticle2(mass = 1, charge = 0, nearCharge = 0, position = new Vector3(), velocity = new Vector3(), fixed = false) {
    let p = new Particle();
    p.mass = mass;
    p.charge = charge;
    p.nearCharge = nearCharge;
    p.position.add(position);
    p.velocity.add(velocity);
    p.fixed = fixed;
    particleList.push(p);
}

function createParticles2(n, massFunc, chargeFunc, nearChargeFunc, positionFunc, velocityFunc) {
    for (let i = 0; i < n; ++i) {
        createParticle2(massFunc(i, n), chargeFunc(i, n), nearChargeFunc(i, n), positionFunc(i, n), velocityFunc(i, n));
    }
}

function simulationNuclei3(graphics, physics) {
    graphics.cameraDistance = 20000;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    setParticleRadius(30, 10);

    physics.forceConstant = 1;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1;
    physics.nearChargeConstant = -60;
    physics.nearChargeRange = 1e3;

    let r = physics.nearChargeRange / 2;
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
            let vec = randomSphericVector(0, r);
            return vec;
        },
        () => {
            let vec = randomVector(v);
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
            let vec = randomSphericVector(2 * r, 10 * r);
            // vec.z = 0;
            return vec;
        },
        () => {
            let vec = randomVector(v);
            //vec.z = 0;
            return vec;
        }
    )
}

function simulationStrongCube0(graphics, physics) {
    graphics.cameraDistance = 20000;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    setParticleRadius(30, 10);

    physics.forceConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nearChargeConstant = 60;
    physics.nearChargeRange = 1e3;

    let r = physics.nearChargeRange / 2;
    let v = 0;
    let m = 1e2;
    let q = 64;
    let nq = 1;
    let n = 1200;

    let grid = [2, 2, 2];
    let space = [
        6 * physics.nearChargeRange,
        6 * physics.nearChargeRange,
        6 * physics.nearChargeRange
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
                        let vec = randomSphericVector(0, r).add(offset);
                        //vec.z = 0;
                        return vec;
                    },
                    () => {
                        //if (offset.x > 0) return new Vector3(-v, 0, 0);
                        //else return new Vector3(v, 0, 0);
                        let vec = randomVector(v);
                        //vec.z = 0;
                        return vec;
                    },
                );
            }
        }
    }
}

function simulationStrongBlob0(graphics, physics) {
    graphics.cameraDistance = 10000;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    setParticleRadius(50, 10);

    physics.forceConstant = 1;
    physics.massConstant = 0;
    physics.chargeConstant = 0;
    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 2e3;

    let r = physics.nearChargeRange;
    let v = 0;
    let m = 1;
    let q = 1;
    let nq = 1;
    let n = 1024;

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
            let vec = randomSphericVector(0, r);
            //vec.z = 0;
            return vec;
        },
        () => {
            let vec = randomVector(v);
            //vec.z = 0;
            return vec;
        },
    );
}

function simulationNuclei2(graphics, physics) {
    graphics.cameraDistance = 10000;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    setParticleRadius(100, 50);

    physics.forceConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 5e3;
    physics.nearChargeConstant = 60;
    physics.nearChargeRange = 1000;
    2
    let x = physics.nearChargeRange / 2;
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

function simulationNuclei1(graphics, physics) {
    graphics.cameraDistance = 1000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 0;
    physics.chargeConstant = 1;
    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 128;

    let m0 = 1;
    let q0 = 1;
    let nq0 = 1;
    let x = physics.nearChargeRange / 2;
    createParticle2(m0, q0, nq0,
        new Vector3(x, 0, 0));
    createParticle2(m0, q0, nq0,
        new Vector3(-x, 0, 0));

    createParticle2(m0, -q0, -nq0,
        new Vector3(0, x, 0));
    createParticle2(m0, -q0, -nq0,
        new Vector3(0, -x, 0));
}

function simulationNuclei0(graphics, physics) {
    graphics.cameraDistance = 2000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.nearChargeConstant = 64;
    physics.nearChargeRange = 128;

    let m0 = 1;
    let m1 = 5;
    let q0 = 150;
    let nq0 = 1;
    let x = physics.nearChargeRange / 3;
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

function simulationStrong2(graphics, physics) {
    graphics.cameraDistance = 5000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1e-2;
    physics.chargeConstant = Math.pow(64, 2);
    physics.nearChargeConstant = Math.pow(7, 2);
    physics.nearChargeRange = 128;

    let x0 = physics.nearChargeRange / 3;
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
    createParticles(
        n,
        (i) => { return 1; },
        (i) => { return -3; },
        () => {
            let p = randomSphericVector(0, r0);
            return p;
        },
        () => {
            return randomVector(0);
        }
    )
}

function simulationStrong1(graphics, physics) {
    graphics.cameraDistance = 4000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = Math.pow(80, 2);
    physics.nearChargeConstant = Math.pow(5, 2);
    physics.nearChargeRange = 128;

    let x0 = physics.nearChargeRange / 3;
    let r1 = 256;
    let v1 = 15;

    let m0 = 1;
    let q0 = -3;

    createNuclei0(x0);
    createParticle2(m0, q0, 0,
        new Vector3(0, r1, 0),
        new Vector3(v1, 0, 0));
}

function simulationStrong0(graphics, physics) {
    graphics.cameraDistance = 2000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 0;
    physics.chargeConstant = 0;
    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 128;

    let x = physics.nearChargeRange / 3;
    let v = 0;
    let m = 1;
    let q = 1;
    let sq = 1;

    createParticle2(m, q, sq, new Vector3(x, 0, 0), new Vector3(0, v, 0));
    createParticle2(m, -q, -sq, new Vector3(-x, 0, 0), new Vector3(-0, v, 0));
}

function simulationMove1(graphics, physics) {
    graphics.cameraDistance = 3000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1;
    physics.chargeConstant = 1;

    let r0 = 32;
    let x = -200;
    let v = 0;
    let n = 512;
    let m = 1;
    let q = 1;

    createParticles(
        n,
        (i) => { return m; },
        (i) => { return q; },
        () => {
            let p = randomSphericVector(0, r0);
            p.add(new Vector3(x, 0, 0));
            return p;
        },
        () => {
            return new Vector3(v, 0, 0);
        }
    )

    createParticles(
        n,
        (i) => { return m; },
        (i) => { return -q; },
        () => {
            let p = randomSphericVector(0, r0);
            p.add(new Vector3(-x, 0, 0));
            return p;
        },
        () => {
            return new Vector3(-v, 0, 0);
        }
    )
}

function simulationMove0(graphics, physics) {
    graphics.cameraDistance = 3000;
    //graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1;
    physics.chargeConstant = 1;

    let x = -1000;
    let v = 5;
    let m = 1e3;
    let q = 1;
    createParticle(m, q, new Vector3(x, 0, 0), new Vector3(v, 0, 0));

    let r0 = 32;
    let v0 = 0;
    createParticles(
        1000,
        (i) => { return 1; },
        (i) => { return -q; },
        () => { return randomSphericVector(0, r0); },
        () => { return randomVector(v0); }
    )
}

function simulationBlob0(graphics, physics) {
    graphics.cameraDistance = 4000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 10;
    physics.massConstant = 1;
    physics.chargeConstant = 7;

    let r0 = 128;
    let v0 = 3;
    createParticles(
        1024,
        (i) => { return 1; },
        (i) => { return random(-1, 1, true); },
        () => { return randomSphericVector(0, r0); },
        () => { return randomVector(v0); }
    )
}

function simulationAtom1(graphics, physics) {
    graphics.cameraDistance = 3000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1e2;
    physics.nearChargeConstant = 1e2;
    physics.nearChargeRange = 128;

    let r0 = 64;
    let v0 = 1;
    createParticles2(
        64,
        (i) => { return (i % 2) ? (1839) : (1836); },
        (i) => { return (i % 2) ? (0) : (1); },
        (i) => { return (i % 2) ? (-1) : (1); },
        () => { return randomSphericVector(0, r0); },
        () => { return randomVector(v0); }
    )

    let r1 = 1e3;
    let v1 = 1;
    createParticles(
        1000,
        () => { return 1; },
        () => { return -1; },
        () => { return randomSphericVector(r0, r1); },
        () => { return randomVector(v1); }
    );
}

function simulationAtom0(graphics, physics) {
    graphics.cameraDistance = 1000;
    graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1;
    physics.chargeConstant = 1;

    createParticle(1836, 1);

    let v0 = 1;
    let r0 = 1e3;
    let n = 1e3;
    createParticles(
        n,
        () => { return 1; },
        () => { return -1; },
        () => { return randomSphericVector(0, r0); },
        () => { return randomVector(v0); }
    );
}
