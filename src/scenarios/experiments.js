import { Vector3 } from 'three';
import { setParticleList, createParticle, bidimensionalMode, createParticles, randomSphericVector, randomVector } from './helpers';
import { setParticleRadius, setBoundaryDistance } from '../simulation';
import { fieldCleanup } from '../simulation';
import { cubeGenerator, random } from '../helpers';
import { maxParticles } from '../gpu/graphicsGPU';

export const experiments = [
    experiment4,
    experiment3,
    experiment2,
    experiment1,
    experiment0,
];

function defaultParameters(graphics, physics, cameraDistance = 5000) {
    setParticleList(physics.particleList);
    
    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1.0 / 137;
    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e3;

    setParticleRadius(20, 10);
    setBoundaryDistance(1e6);
    bidimensionalMode(true);
}

function experiment4(graphics, physics) {
    defaultParameters(graphics, physics, 2e5);
    fieldCleanup(graphics);
    setParticleRadius(3e3, 2e3);
    setBoundaryDistance(1e8);

    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e4;
    physics.massConstant = 1;
    physics.chargeConstant = 1;
    physics.minDistance = Math.pow(0.5, 2);

    let m = 1;
    let q = 1/3;
    let nq = 1;
    let r0 = 0.01 * physics.nearChargeRange;
    let v = 0;
    let n = maxParticles;

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
            s = (random(0, 1, true) ? (-1) : (1));
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
    let n = maxParticles;

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
            if (mass/m < 0.5) return 0.0;
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
    let q = 1/3;
    let nq = 1;
    let r0 = 1;//0.01*physics.nearChargeRange;
    let v = 0;
    let n = maxParticles;

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
    let q = 1/3;
    let nq = 1;
    let r0 = 1;//0.01*physics.nearChargeRange;
    let v = 0;
    let n = maxParticles;

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
    let q = 1/3;
    let nq = 1;
    let r0 = 1;//0.01*physics.nearChargeRange;
    let v = 0;
    let n = maxParticles;

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