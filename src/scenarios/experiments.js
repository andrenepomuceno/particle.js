import { Vector3 } from 'three';
import { createParticleList, randomSphericVector, randomVector, createNuclei } from './helpers';
import { random, hexagonGenerator, shuffleArray, cubeGenerator } from '../helpers';

export const experiments = [
    hexagon3,
    //hexagon3d,
    hexagon1,
    hexagon2,
    hexagon0,
    density2,
    density,
    magnecticForce,
    experiment9,
    donut,
    terrarium,
    twinsCollision,
    experiment5,
    wildParticles,
    easterEgg,
    experiment2,
    experiment1,
    experiment0,
];

function defaultParameters(simulation, cameraDistance = 5000) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    simulation.fieldCleanup();

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1.0 / 137;
    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e3;

    simulation.setParticleRadius(20, 10);
    physics.boundaryDistance = 1e6;
    simulation.bidimensionalMode(true);
}

function hexagon3d(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);
    simulation.bidimensionalMode(false);

    let n = graphics.maxParticles;
    physics.boundaryDamping = 0.5;
    physics.boundaryDistance = 1e12;
    physics.minDistance2 = Math.pow(0.5, 2);

    physics.nearChargeRange = 5e2;
    physics.nearChargeConstant = 2;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1 / 60;

    simulation.setParticleRadius(50, 20);
    graphics.cameraDistance = 1e4;
    graphics.cameraSetup();

    simulation.fieldProbeConfig(0, 0, 10);
    //simulation.fieldSetup("2d", 100);

    let m = 1;
    let q = 1;
    let nq = 1;
    let v = 0;
    let r0 = 0.05 * physics.nearChargeRange;
    let r1 = 0.618 * physics.nearChargeRange;
    let r2 = 0.59 * physics.nearChargeRange;
    let r3 = 0.69 * physics.nearChargeRange;
    let an = 1;
    let w = Math.round(Math.sqrt(n / (7 * an * 4)));
    let grid = [6, 6];

    let depth = 30;
    for (let z = -depth / 2; z <= depth / 2; z++)
        hexagonGenerator((vertex, totalLen) => {
            //let hole = 1e3;
            //if (vertex.x > hole && (Math.abs(vertex.y) < hole)) return;
            let s = ((vertex.i % 2 == 0) ? (1) : (-1));
            if (z % 2 == 0) {
                s = ((vertex.i % 2 == 0) ? (-1) : (1));
            }
            let width = totalLen[0];
            let height = totalLen[1];
            let theta = 20 * Math.PI / 180;
            let center = new Vector3(vertex.x, vertex.y, r3 * z).applyAxisAngle(
                new Vector3(0, 1, 0), Math.PI / 2
            ).applyAxisAngle(
                new Vector3(0, 0, 1), theta
            ).add(
                new Vector3(0, depth * r3 / 2 * Math.sin(theta), 0)
            );
            //let v2 = new Vector3(0, (vertex.x+1e4)/1e3, 0);
            createNuclei(an, m, q, s * nq, r0, r1, v, center, 0, 0);
        }, r2, grid);

    shuffleArray(simulation.particleList);

    //m = 0;
    //nq = 0;
    for (let i = 0; i < 500; i++) {
        let x0 = -2e4 - 2.0 * i * physics.nearChargeRange;
        let v0 = 3e2;
        createParticleList(physics.particleList,
            0.5 * m, -1 * q, (i % 2) ? (nq) : (-nq),
            new Vector3(x0, 2.0 * physics.nearChargeRange, 0),
            new Vector3(v0, 0, 0)
        );
        createParticleList(physics.particleList,
            0.5 * m, -1 * q, (i % 2) ? (-nq) : (nq),
            new Vector3(x0, 0, 0),
            new Vector3(v0, 0, 0)
        );
        createParticleList(physics.particleList,
            0.5 * m, -1 * q, (i % 2) ? (nq) : (-nq),
            new Vector3(x0, - 2.0 * physics.nearChargeRange, 0),
            new Vector3(v0, 0, 0)
        );
    }
}

function hexagon3(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    let n = graphics.maxParticles;
    physics.boundaryDamping = 0.5;
    physics.boundaryDistance = 1e12;
    physics.minDistance2 = Math.pow(0.5, 2);

    physics.nearChargeRange = 5e2;
    physics.nearChargeConstant = 1;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1 / 60;

    simulation.setParticleRadius(50, 20);
    graphics.cameraDistance = 1e4;
    graphics.cameraSetup();

    simulation.fieldProbeConfig(0, 0, 10);
    //simulation.fieldSetup("2d", 100);

    let m = 1;
    let q = 1;
    let nq = 1;
    let v = 0;
    let r0 = 0.05 * physics.nearChargeRange;
    let r1 = 0.618 * physics.nearChargeRange;
    let r2 = 0.57 * physics.nearChargeRange;
    let an = 2;
    let w = Math.round(Math.sqrt(n / (6 * an * 4)));
    let grid = [1.2 * w, w * 0.8, 1];

    hexagonGenerator((vertex, totalLen) => {
        //let hole = 1e3;
        //if (vertex.x > hole && (Math.abs(vertex.y) < hole)) return;
        let width = totalLen[0];
        let theta = 20 * Math.PI / 180;
        let center = new Vector3(vertex.x, vertex.y, 0).applyAxisAngle(
            new Vector3(0, 0, 1), theta
        ).add(new Vector3(0, width / 2 * Math.sin(theta), 0));
        //let v2 = new Vector3(0, (vertex.x+1e4)/1e3, 0);
        let s = ((vertex.i % 2 == 0) ? (1) : (-1));
        createNuclei(an, m, q, s * nq, r0, r1, v, center, 0, an);
    }, r2, grid);

    /*w = Math.round(Math.sqrt(n / (6 * an)));
    w = (w % 2 == 0) ? (w - 1) : (w);
    grid = [2*w - 1, w/2, 1];
    let theta = 45 * Math.PI / 180;
    let width = grid[0] * r1;
    let aux = 0;
    cubeGenerator((x, y, z) => {
        let s = ((aux % 2 == 0) ? (1) : (-1));
        let center = new Vector3(x, y, z).applyAxisAngle(
            new Vector3(0, 0, 1), theta
        );
        createNuclei(an, m, q, s * nq, r0, r1, v, center, 0, 0);
        ++aux;
    }, width, grid);*/

    shuffleArray(simulation.particleList);

    for (let i = 0; i < 500; i++) {
        let focus = 0.01;
        let spacing = 3;
        let x0 = -2e4 - spacing * i * physics.nearChargeRange;
        let v0 = 2.5e2;
        let ne = random(1, 4, true);
        createParticles(physics.particleList, ne,
            () => { return 0.5 * m; },
            () => { return -1 * q; },
            () => {
                //return (random(0, 1, true)) ? (nq) : (-nq);
                return (i % 2) ? (-nq) : (nq);
            },
            () => {
                return randomSphericVector(0, focus * physics.nearChargeRange, simulation.mode2D).add(
                    new Vector3(x0, 0, 0)
                )
            },
            () => { return new Vector3(v0, 0, 0); }
        );
    }
}

function hexagon2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    let n = graphics.maxParticles;
    physics.boundaryDamping = 0.5;
    physics.boundaryDistance = 1e5;
    physics.minDistance2 = Math.pow(0.5, 2);

    physics.nearChargeRange = 5e2;
    physics.nearChargeConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1 / 60;

    simulation.setParticleRadius(50, 20);
    graphics.cameraDistance = 1e4;
    graphics.cameraSetup();

    simulation.fieldProbeConfig(0, 0, 10);
    //simulation.fieldSetup("2d", 100);

    let m = 1;
    let q = 1;
    let nq = 1;
    let v = 0;
    let r0 = 0.01 * physics.nearChargeRange;
    let r1 = 0.618 * physics.nearChargeRange;
    let r2 = 0.57 * physics.nearChargeRange;
    let an = 2;
    let w = Math.round(Math.sqrt(n / (7 * an * 8)));
    let grid = [w, w];

    let c = new Vector3(5e3, 0, 0);
    let v2 = new Vector3(2, 0, 0);
    hexagonGenerator((vertex) => {
        let s = ((vertex.i % 2 == 0) ? (1) : (-1));
        createNuclei(an, m, q, s * nq, r0, r1, v, new Vector3(vertex.x, vertex.y, 0).sub(c), an, an, new Vector3().add(v2));
        createNuclei(an, m, q, s * nq, r0, r1, v, new Vector3(vertex.x, vertex.y, 0).add(c), an, an, new Vector3().sub(v2));
    }, r2, grid);

    shuffleArray(simulation.particleList);
}

function hexagon1(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    let n = graphics.maxParticles;
    physics.boundaryDamping = 0.5;
    physics.boundaryDistance = 1e12;
    physics.minDistance2 = Math.pow(0.5, 2);

    physics.nearChargeRange = 5e2;
    physics.nearChargeConstant = 1;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1 / 60;

    simulation.setParticleRadius(50, 20);
    graphics.cameraDistance = 1e4;
    graphics.cameraSetup();

    simulation.fieldProbeConfig(0, 0, 10);
    //simulation.fieldSetup("2d", 100);

    let m = 1;
    let q = 1;
    let nq = 1;
    let v = 0;
    let r0 = 0.05 * physics.nearChargeRange;
    let r1 = 0.618 * physics.nearChargeRange;
    let r2 = 0.57 * physics.nearChargeRange;
    let an = 2;
    let w = Math.round(Math.sqrt(n / (7 * an * 4)));
    let grid = [5 / 3 * w, 3 / 5 * w];

    hexagonGenerator((vertex, totalLen) => {
        //let hole = 1e3;
        //if (vertex.x > hole && (Math.abs(vertex.y) < hole)) return;
        let s = ((vertex.i % 2 == 0) ? (1) : (-1));
        let width = totalLen[0];
        let height = totalLen[1];
        let theta = 20 * Math.PI / 180;
        let center = new Vector3(vertex.x, vertex.y, 0).applyAxisAngle(
            new Vector3(0, 0, 1), theta
        ).add(new Vector3(0, width / 2 * Math.sin(theta), 0));
        //let v2 = new Vector3(0, (vertex.x+1e4)/1e3, 0);
        createNuclei(an, m, q, s * nq, r0, r1, v, center, 0, 0);
    }, r2, grid);

    shuffleArray(simulation.particleList);

    for (let i = 0; i < 500; i++) {
        let x0 = -2e4 - 2.0 * i * physics.nearChargeRange;
        let v0 = 2e2;
        createParticleList(physics.particleList,
            0.5 * m, -1 * q, (i % 2) ? (nq) : (-nq),
            new Vector3(x0, 2.0 * physics.nearChargeRange, 0),
            new Vector3(v0, 0, 0)
        );
        createParticleList(physics.particleList,
            0.5 * m, -1 * q, (i % 2) ? (-nq) : (nq),
            new Vector3(x0, 0, 0),
            new Vector3(v0, 0, 0)
        );
        createParticleList(physics.particleList,
            0.5 * m, -1 * q, (i % 2) ? (nq) : (-nq),
            new Vector3(x0, - 2.0 * physics.nearChargeRange, 0),
            new Vector3(v0, 0, 0)
        );
    }
}

function hexagon0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    let n = graphics.maxParticles;
    physics.boundaryDamping = 0.5;
    physics.boundaryDistance = 1e5;
    physics.minDistance2 = Math.pow(0.5, 2);

    physics.nearChargeRange = 5e2;
    physics.nearChargeConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1 / 60;

    simulation.setParticleRadius(50, 20);
    graphics.cameraDistance = 1e4;
    graphics.cameraSetup();

    simulation.fieldProbeConfig(0, 0, 10);
    //simulation.fieldSetup("2d", 100);

    let m = 1;
    let q = 1;
    let nq = 1;
    let v = 0;
    let r0 = 0.05 * physics.nearChargeRange;
    let r1 = 0.618 * physics.nearChargeRange;
    let r2 = 0.57 * physics.nearChargeRange;
    let an = 2;
    let w = Math.round(Math.sqrt(n / (7 * an * 4)));
    let grid = [w, w];

    hexagonGenerator((vertex) => {
        let s = ((vertex.i % 2 == 0) ? (1) : (-1));
        createNuclei(an, m, q, s * nq, r0, r1, v, new Vector3(vertex.x, vertex.y), an, an);
    }, r2, grid);

    shuffleArray(simulation.particleList);
}

function density2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);
    simulation.setParticleRadius(10, 5);

    let n = graphics.maxParticles;

    physics.nearChargeRange = 5e2;
    physics.nearChargeConstant = 1;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1 / 60;

    let density = 1;
    let area = n / density;
    let r0 = Math.sqrt(physics.nearChargeRange * area);
    console.log("r0 = " + r0);
    console.log("r0/nearChargeRange = " + r0 / physics.nearChargeRange);

    graphics.cameraDistance = r0;

    physics.boundaryDamping = 0.5;
    physics.boundaryDistance = 1.0 * r0;
    physics.minDistance2 = Math.pow(1, 2);

    let m = 10;
    let q = 1;
    let nq = 1;
    let v = 0;

    let typeList = [
        //[0, 0, 1],
        [0.5, -1, 1],
        [3, 2 / 3, 1],
        [6, -1 / 3, 1]
    ];

    let idx = undefined;
    createParticles(physics.particleList, n,
        (i) => {
            let len = typeList.length - 1;
            idx = random(0, len, true);
            return m * typeList[idx][0];
        },
        (i, n) => {
            let s = 1;
            s = (random(0, 1, true) ? (-1) : (1));
            let v = s * q;
            v *= typeList[idx][1];
            return v;
        },
        (i) => {
            let s = 1;
            s = (random(0, 1, true) ? (-1) : (1));
            let v = s * nq;
            v *= typeList[idx][2];
            return v;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
            //return randomVector(r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function density(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 3e3);
    simulation.setParticleRadius(10, 5);
    physics.boundaryDistance = 10e3;
    physics.boundaryDamping = 0.9;
    physics.minDistance2 = Math.pow(0.5, 2);

    physics.nearChargeRange = 2e2;
    physics.nearChargeConstant = 1;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1 / 3;

    let m = 10;
    let q = 1;
    let nq = 1;
    let v = 0;
    let n = graphics.maxParticles;

    let density = 1e-4;
    let area = n / density;
    let r0 = Math.sqrt(area / (2 * Math.PI));
    console.log(r0);
    console.log(r0 / physics.nearChargeRange);

    let typeList = [
        [0, 0, 1],
        //[1e-3, 0, 1],
        [0.5, -3, 1],
        [3, 2, 1],
        [6, -1, 1],
    ]

    let idx = undefined;
    createParticles(physics.particleList, n,
        (i) => {
            idx = random(0, typeList.length - 1, true);
            return m * typeList[idx][0];
        },
        (i, n) => {
            let s = 1;
            s = (random(0, 1, true) ? (-1) : (1));
            let v = s * q;
            v *= typeList[idx][1];
            return v;
        },
        (i) => {
            let s = 1;
            s = (random(0, 1, true) ? (-1) : (1));
            let v = s * nq;
            v *= typeList[idx][2];
            return v;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function magnecticForce(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1e3);
    simulation.setParticleRadius(10, 0);
    physics.boundaryDistance = 1e12;

    physics.nearChargeRange = 0;
    physics.nearChargeConstant = 0;
    physics.massConstant = 0;
    physics.chargeConstant = 1;
    physics.minDistance2 = Math.pow(1e-6, 2);

    simulation.fieldProbeConfig(0, 50, 0);
    simulation.fieldSetup("2d", 40);

    let m = 1e30;
    let q = 1e3;
    let nq = 1;
    let n = 1000;

    let v = -7;
    let s = 100;
    let x0 = n / 3 * s;
    x0 = 0;
    let y0 = 0.01;

    let m2 = 1e-0;
    let q2 = 2;

    let v2 = 0;
    let x2 = 0;
    let y2 = -500;

    let x3 = 0;
    let y3 = -200;
    let v3 = new Vector3(0, 1, 0);

    createParticles(physics.particleList, n,
        (i) => {
            return m;
        },
        (i, n) => {
            return q;
        },
        (i) => {
            return 0;
        },
        (i, n) => {
            return new Vector3(-x0 + (i - n / 2) * s, y0, 0);
        },
        (i) => {
            return new Vector3(0, 0, 0);
        }
    );
    createParticles(physics.particleList, n,
        (i) => {
            return m;
        },
        (i, n) => {
            return -q;
        },
        (i) => {
            return 0;
        },
        (i, n) => {
            return new Vector3(x0 + (i - n / 2) * s, -y0, 0);
        },
        (i) => {
            return new Vector3(v, 0, 0);
        }
    );

    //createParticleList(physics.particleList, m2, q2, 0, new Vector3(x2, y2, 0), new Vector3(v2, v2, 0));
    createParticleList(physics.particleList, m2, q2, 0, new Vector3(x3, y3, 0), v3);
}

function experiment9(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 3e3);
    simulation.setParticleRadius(10, 5);
    physics.boundaryDistance = 1e7;
    physics.boundaryDamping = 0.9;

    physics.nearChargeRange = 5e2;
    physics.nearChargeConstant = 10;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1e3;
    physics.minDistance2 = Math.pow(0.5, 2);

    let m = 1e3;
    let q = 1 / 3;
    let nq = 1;
    let v = 0;
    let n = graphics.maxParticles;

    let density = 1e-3;
    let area = n / density;
    let r0 = Math.sqrt(area / (2 * Math.PI));
    console.log(r0);
    console.log(r0 / physics.nearChargeRange);

    let typeList = [
        [0, 0, 1],
        [1e-3, 0, 1],
        [0.5, -3, 1],
        [3, 2, 1],
        [6, -1, 1],
    ]

    let idx = undefined;
    createParticles(physics.particleList, n,
        (i) => {
            //idx = i % (typeList.length);
            idx = random(0, typeList.length - 1, true);
            return m * typeList[idx][0];
        },
        (i, n) => {
            let s = 1;
            s = (random(0, 1, true) ? (-1) : (1));
            let v = s * q;
            //v *= random(1, 3, true);
            v *= typeList[idx][1];
            //v = Math.abs(v);
            return v;
        },
        (i) => {
            let s = 1;
            s = (random(0, 1, true) ? (-1) : (1));
            let v = s * nq;
            v *= typeList[idx][2];
            return v;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function donut(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1e4);
    simulation.setParticleRadius(5e1, 3e1);
    physics.boundaryDistance = 1e5;
    physics.boundaryDamping = 0.9;

    physics.nearChargeRange = 1e3;
    physics.nearChargeConstant = 60;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1e3;
    physics.minDistance2 = Math.pow(0.5, 2);

    let m = 1e3;
    let q = 1 / 3;
    let nq = 1;
    let r0 = 4 * physics.nearChargeRange;
    let v = 0;
    let n = graphics.maxParticles;

    let typeList = [
        [0, 0, 1],
        [0.001, 0, 1],
        [0.511, -3, 1],
        [3, 2, 1],
        [6, -1, 1],
    ]

    let idx = undefined;
    createParticles(physics.particleList, n,
        (i) => {
            //idx = i % (typeList.length);
            idx = random(0, typeList.length - 1, true);
            return m * typeList[idx][0];
        },
        (i, n) => {
            let s = 1;
            //s = (random(0, 1, true) ? (-1) : (1));
            let v = s * q;
            //v *= random(1, 3, true);
            v *= typeList[idx][1];
            return v;
        },
        (i) => {
            let s = 1;
            s = (random(0, 1, true) ? (-1) : (1));
            let v = s * nq;
            v *= typeList[idx][2];
            return v;
        },
        (i) => {
            return randomSphericVector(0.5 * r0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}


function terrarium(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.4e6);
    simulation.setParticleRadius(5e3, 1e3);
    physics.boundaryDistance = 1e6;
    physics.boundaryDamping = 0.95;

    physics.nearChargeRange = 1e6;
    physics.nearChargeConstant = 1;
    physics.massConstant = 0;
    physics.chargeConstant = 1;
    physics.minDistance2 = Math.pow(0.5, 2);

    let m = 1e3;
    let q = 1 / 3;
    let nq = 1;
    let r0 = 1;//0.5 * physics.nearChargeRange;
    let v = 0;
    let n = graphics.maxParticles;

    let typeList = [
        [0, 0, 1],
        [0.001, 0, 1],
        [0.511, -3, 1],
        [3, 2, 1],
        [6, -1, 1],
    ]

    let idx = undefined;
    createParticles(physics.particleList, n,
        (i) => {
            //idx = i % (typeList.length);
            idx = random(0, typeList.length - 1, true);
            return m * typeList[idx][0];
        },
        (i, n) => {
            let s = 1;
            //s = (random(0, 1, true) ? (-1) : (1));
            let v = s * q;
            //v *= random(1, 3, true);
            v *= typeList[idx][1];
            return v;
        },
        (i) => {
            let s = 1;
            s = (random(0, 1, true) ? (-1) : (1));
            let v = s * nq;
            v *= typeList[idx][2];
            return v;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function twinsCollision(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 3e3);
    simulation.setParticleRadius(5, 1);
    physics.boundaryDistance = 2e4;
    physics.boundaryDamping = 0.95;

    physics.nearChargeRange = 1e3;
    physics.nearChargeConstant = 10;
    physics.massConstant = 0;
    physics.chargeConstant = 1;
    physics.minDistance2 = Math.pow(0.5, 2);

    let m = 1e3;
    let q = 1 / 3;
    let nq = 1;
    let r0 = 1;//0.5 * physics.nearChargeRange;
    let v = 0;
    let n = 80 * 80; //maxParticles;

    let typeList = [
        [0, 0, 1],
        [0.001, 0, 1],
        [0.511, -3, 1],
        [3, 2, 1],
        [6, -1, 1],
    ]

    let idx = undefined;
    createParticles(physics.particleList, n,
        (i) => {
            //idx = i % (typeList.length);
            idx = random(0, typeList.length - 1, true);
            return m * typeList[idx][0];
        },
        (i, n) => {
            let s = 1;
            //s = (random(0, 1, true) ? (-1) : (1));
            let v = s * q;
            //v *= random(1, 3, true);
            v *= typeList[idx][1];
            return v;
        },
        (i) => {
            let s = 1;
            s = (random(0, 1, true) ? (-1) : (1));
            let v = s * nq;
            v *= typeList[idx][2];
            return v;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function experiment5(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 3.3e4);
    simulation.setParticleRadius(5e1, 3e1);
    physics.boundaryDistance = 5e4;
    physics.boundaryDamping = 0.9;

    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e4;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1;
    physics.minDistance2 = Math.pow(0.5, 2);

    let m = 1e3;
    let q = 1 / 3;
    let nq = 1;
    let r0 = 0.1 * physics.nearChargeRange;
    let v = 0;
    let n = graphics.maxParticles;

    let typeList = [
        [0, 0, 1],
        [0.01, 0, 1],
        [0.511, -3, 1],
        [3, 2, 1],
        [6, -1, 1],
    ]

    let idx = undefined;
    createParticles(physics.particleList, n,
        (i) => {
            //idx = i % (typeList.length);
            idx = random(0, typeList.length - 1, true);
            return m * typeList[idx][0];
        },
        (i, n) => {
            let s = 1;
            //s = (random(0, 1, true) ? (-1) : (1));
            let v = s * q;
            //v *= random(1, 3, true);
            v *= typeList[idx][1];
            return v;
        },
        (i) => {
            let s = 1;
            s = (random(0, 1, true) ? (-1) : (1));
            let v = s * nq;
            v *= typeList[idx][2];
            return v;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function wildParticles(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 2e5);
    simulation.setParticleRadius(3e2, 2e2);
    physics.boundaryDistance = 5e5;
    physics.boundaryDamping = 0.9;

    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e4;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1e-2;
    physics.minDistance2 = Math.pow(0.5, 2);

    let m = 1;
    let q = 1 / 3;
    let nq = 1;
    let r0 = 0.01 * physics.nearChargeRange;
    let v = 0;
    let n = graphics.maxParticles;

    let typeList = [
        [0, 0, 1],
        [0.01, 0, 1],
        [0.511, -3, 1],
        [3, 2, 1],
        [6, -1, 1],
    ]

    let typeIdx = undefined;
    createParticles(physics.particleList, n,
        (i) => {
            //idx = i % (typeList.length);
            typeIdx = random(0, typeList.length - 1, true);
            return m * typeList[typeIdx][0];
        },
        (i, n) => {
            let s = 1;
            //s = (random(0, 1, true) ? (-1) : (1));
            let v = s * q;
            //v *= random(1, 3, true);
            v *= typeList[typeIdx][1];
            return v;
        },
        (i) => {
            let s = 1;
            s = (random(0, 1, true) ? (-1) : (1));
            let v = s * nq;
            v *= typeList[typeIdx][2];
            return v;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function easterEgg(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 2e7);
    simulation.fieldCleanup();
    simulation.setParticleRadius(3e1, 1e1);
    simulation.physics.boundaryDistance = 2e9;

    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e3;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.minDistance2 = Math.pow(0.5, 2);

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 0.01 * physics.nearChargeRange;
    let v = 0;
    let n = graphics.maxParticles;

    let list = [
        [0, 0],
        [1e-2, 0],
        [0.5, -3],
        //[0.5, 3],
        [4, 2],
        //[4, -2],
        [9, -1],
        //[9, 1]
    ]

    const massThreshold = 0.2;
    createParticles(physics.particleList, n,
        (i) => {
            let idx = i % (list.length);
            idx = random(0, list.length - 1, true);
            return m * list[idx][0];
        },
        (i, n, mass) => {
            if (mass / m < 0.5) return 0.0;
            let s = 1;
            s = (random(0, 1, true) ? (-1) : (1));
            let v = s * q;
            v *= random(1, 3, true);
            return v;
        },
        (i) => {
            let s = 1;
            s = (random(0, 1, true) ? (-1) : (1));
            let v = s * nq;
            return v;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function experiment2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 2e7);
    simulation.fieldCleanup();
    simulation.setParticleRadius(2e1, 1e1);
    simulation.physics.boundaryDistance = 1e8;

    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e6;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.minDistance2 = Math.pow(0.5, 2);
    physics.boundaryDamping = 0.9;

    let m = 1;
    let q = 1 / 3;
    let nq = 1;
    let r0 = 1;//0.01*physics.nearChargeRange;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticles(physics.particleList, n,
        (i) => {
            let val = [0, 1e-3, 1, 4, 9];
            return m * val[random(0, val.length - 1, true)];
            /*if (random(0, 1) <= massThreshold) {
                return 0.0;
            }*/
            return m * random(1, 3, true);
            //return m * random(0, 1);
            return m;
        },
        (i, n, m) => {
            let val = [0, 1, 2, 3];
            return q * val[random(0, val.length - 1, true)];
            //if (m == 0.0) return 0.0;
            //let charge = (i % 2) ? (-q) : (q);
            let charge = (random(0, 1, true)) ? (-q) : (q);
            charge *= random(1, 3, true);
            //charge *= random(0, 1);
            return charge;
        },
        (i) => {
            /*let seq = [-nq, nq, nq, -nq];
            let nearCharge = seq[i % 4];*/

            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nearCharge *= random(1, 2, true);
            return nearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function experiment1(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 2e6);
    simulation.fieldCleanup();
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e8;

    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;
    physics.minDistance2 = Math.pow(0.5, 2);

    let m = 2;
    let q = 1 / 3;
    let nq = 1;
    let r0 = 1;//0.01*physics.nearChargeRange;
    let v = 0;
    let n = Math.min(graphics.maxParticles, 80 * 80);

    const massThreshold = 0.2;
    createParticles(physics.particleList, n,
        (i) => {
            let val = [0, 1e-2, 1, 4, 9];
            return m * val[random(0, val.length - 1, true)];
            /*if (random(0, 1) <= massThreshold) {
                return 0.0;
            }*/
            return m * random(1, 3, true);
            //return m * random(0, 1);
            return m;
        },
        (i, n, m) => {
            //if (m == 0.0) return 0.0;
            //let charge = (i % 2) ? (-q) : (q);
            let charge = (random(0, 1, true)) ? (-q) : (q);
            charge *= random(1, 3, true);
            //charge *= random(0, 1);
            return charge;
        },
        (i) => {
            /*let seq = [-nq, nq, nq, -nq];
            let nearCharge = seq[i % 4];*/

            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nearCharge *= random(1, 2, true);
            return nearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function experiment0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 2e6);
    simulation.fieldCleanup();
    simulation.setParticleRadius(2e1, 1e1);
    simulation.physics.boundaryDistance = 1e8;

    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e6;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.minDistance2 = Math.pow(0.5, 2);

    let m = 1;
    let q = 1 / 3;
    let nq = 1;
    let r0 = 1;//0.01*physics.nearChargeRange;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticles(physics.particleList, n,
        (i) => {
            let val = [0, 1, 4, 9];
            return m * val[random(0, val.length - 1, true)];
            /*if (random(0, 1) <= massThreshold) {
                return 0.0;
            }*/
            return m * random(1, 3, true);
            //return m * random(0, 1);
            return m;
        },
        (i, n, m) => {
            //if (m == 0.0) return 0.0;
            //let charge = (i % 2) ? (-q) : (q);
            let charge = (random(0, 1, true)) ? (-q) : (q);
            charge *= random(1, 3, true);
            //charge *= random(0, 1);
            return charge;
        },
        (i) => {
            /*let seq = [-nq, nq, nq, -nq];
            let nearCharge = seq[i % 4];*/

            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nearCharge *= random(1, 2, true);
            return nearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}