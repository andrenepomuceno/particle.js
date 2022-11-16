import { Vector3 } from 'three';
import { setParticleList, createParticle, bidimensionalMode, createParticles, randomSphericVector, randomVector } from './helpers';
import { setParticleRadius, setBoundaryDistance, fieldSetup, fieldProbeConfig } from '../simulation';
import { fieldCleanup } from '../simulation';
import { cubeGenerator, random } from '../helpers';

export const experiments = [
    density2,
    density,
    magnecticForce,
    experiment9,
    donut,
    terrarium,
    twinsCollision,
    experiment5,
    wildParticles,
    experiment3,
    experiment2,
    experiment1,
    experiment0,
];

function defaultParameters(graphics, physics, cameraDistance = 5000) {
    setParticleList(physics.particleList);
    fieldCleanup(graphics);

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1.0 / 137;
    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e3;

    setParticleRadius(20, 10);
    physics.boundaryDistance = 1e6;
    bidimensionalMode(true);
}

function density2(graphics, physics) {
    defaultParameters(graphics, physics, 3e3);
    setParticleRadius(10, 5);
    physics.boundaryDistance = 1e4;
    physics.boundaryDamping = 0.9;
    physics.minDistance = Math.pow(0.1, 2);

    physics.nearChargeRange = 2e2;
    physics.nearChargeConstant = 1;
    physics.massConstant = 1e-9;
    physics.chargeConstant = 1e-3;

    let m = 10;
    let q = 1;
    let nq = 1;
    let v = 0;
    let n = graphics.maxParticles;

    let density = 2;
    let area = n / density;
    let r0 = Math.sqrt(physics.nearChargeRange * area);
    console.log("r0 = " + r0);
    console.log("r0/nearChargeRange = " + r0 / physics.nearChargeRange);

    let typeList = [
        [0, 0, 1],
        [0.5, -1, 1],
        [3, 2/3, 1],
        [6, -1/3, 1]
    ];

    let idx = undefined;
    createParticles(n,
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
            //return randomSphericVector(0, r0);
            return randomVector(r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}

function density(graphics, physics) {
    defaultParameters(graphics, physics, 3e3);
    setParticleRadius(10, 5);
    physics.boundaryDistance = 10e3;
    physics.boundaryDamping = 0.9;
    physics.minDistance = Math.pow(0.5, 2);

    physics.nearChargeRange = 2e2;
    physics.nearChargeConstant = 1;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1/3;

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
    createParticles(n,
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
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}

function magnecticForce(graphics, physics) {
    defaultParameters(graphics, physics, 1e3);
    setParticleRadius(10, 0);
    physics.boundaryDistance = 1e12;

    physics.nearChargeRange = 0;
    physics.nearChargeConstant = 0;
    physics.massConstant = 0;
    physics.chargeConstant = 1;
    physics.minDistance = Math.pow(1e-6, 2);

    fieldProbeConfig(0, 1e4, 0);
    fieldSetup("2d", 40);

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
    let q2 = 1;

    let v2 = 0;
    let x2 = 0;
    let y2 = -500;

    let x3 = 0;
    let y3 = -300;
    let v3 = new Vector3(0, 1, 0);

    createParticles(n,
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

    createParticles(n,
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

    //createParticle(m2, q2, 0, new Vector3(x2, y2, 0), new Vector3(v2, v2, 0));
    createParticle(m2, q2, 0, new Vector3(x3, y3, 0), v3);
}

function experiment9(graphics, physics) {
    defaultParameters(graphics, physics, 3e3);
    setParticleRadius(10, 5);
    physics.boundaryDistance = 1e7;
    physics.boundaryDamping = 0.9;

    physics.nearChargeRange = 5e2;
    physics.nearChargeConstant = 10;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1e3;
    physics.minDistance = Math.pow(0.5, 2);

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
    createParticles(n,
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
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}

function donut(graphics, physics) {
    defaultParameters(graphics, physics, 1e4);
    setParticleRadius(5e1, 3e1);
    physics.boundaryDistance = 1e5;
    physics.boundaryDamping = 0.9;

    physics.nearChargeRange = 1e3;
    physics.nearChargeConstant = 60;
    physics.massConstant = 1e-6;
    physics.chargeConstant = 1e3;
    physics.minDistance = Math.pow(0.5, 2);

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
    createParticles(n,
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
            return randomSphericVector(0.5 * r0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}


function terrarium(graphics, physics) {
    defaultParameters(graphics, physics, 1.4e6);
    setParticleRadius(5e3, 1e3);
    physics.boundaryDistance = 1e6;
    physics.boundaryDamping = 0.95;

    physics.nearChargeRange = 1e6;
    physics.nearChargeConstant = 1;
    physics.massConstant = 0;
    physics.chargeConstant = 1;
    physics.minDistance = Math.pow(0.5, 2);

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
    createParticles(n,
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
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}

function twinsCollision(graphics, physics) {
    defaultParameters(graphics, physics, 3e3);
    setParticleRadius(5, 1);
    physics.boundaryDistance = 1e4;
    physics.boundaryDamping = 0.95;

    physics.nearChargeRange = 1e3;
    physics.nearChargeConstant = 10;
    physics.massConstant = 0;
    physics.chargeConstant = 1;
    physics.minDistance = Math.pow(0.5, 2);

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
    createParticles(n,
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
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}

function experiment5(graphics, physics) {
    defaultParameters(graphics, physics, 3.3e4);
    setParticleRadius(5e1, 3e1);
    physics.boundaryDistance = 5e4;
    physics.boundaryDamping = 0.95;

    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e4;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.minDistance = Math.pow(0.5, 2);

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
    createParticles(n,
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
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}

function wildParticles(graphics, physics) {
    defaultParameters(graphics, physics, 2e5);
    setParticleRadius(3e2, 2e2);
    physics.boundaryDistance = 5e5;
    physics.boundaryDamping = 0.99;

    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e4;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.minDistance = Math.pow(0.5, 2);

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
    createParticles(n,
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
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}

function experiment3(graphics, physics) {
    defaultParameters(graphics, physics, 2e7);
    fieldCleanup(graphics);
    setParticleRadius(3e1, 1e1);
    setBoundaryDistance(2e9);

    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e3;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.minDistance = Math.pow(0.5, 2);

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
    createParticles(n,
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
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}

function experiment2(graphics, physics) {
    defaultParameters(graphics, physics, 2e7);
    fieldCleanup(graphics);
    setParticleRadius(2e1, 1e1);
    setBoundaryDistance(1e8);

    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e6;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.minDistance = Math.pow(0.5, 2);

    let m = 1;
    let q = 1 / 3;
    let nq = 1;
    let r0 = 1;//0.01*physics.nearChargeRange;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticles(n,
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
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}

function experiment1(graphics, physics) {
    defaultParameters(graphics, physics, 2e6);
    fieldCleanup(graphics);
    setParticleRadius(2e1, 1e1);
    setBoundaryDistance(1e8);

    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;
    physics.minDistance = Math.pow(0.5, 2);

    let m = 1;
    let q = 1 / 3;
    let nq = 1;
    let r0 = 1;//0.01*physics.nearChargeRange;
    let v = 0;
    let n = Math.min(graphics.maxParticles, 80 * 80);

    const massThreshold = 0.2;
    createParticles(n,
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
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}

function experiment0(graphics, physics) {
    defaultParameters(graphics, physics, 2e6);
    fieldCleanup(graphics);
    setParticleRadius(2e1, 1e1);
    setBoundaryDistance(1e8);

    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e6;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.minDistance = Math.pow(0.5, 2);

    let m = 1;
    let q = 1 / 3;
    let nq = 1;
    let r0 = 1;//0.01*physics.nearChargeRange;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticles(n,
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
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}