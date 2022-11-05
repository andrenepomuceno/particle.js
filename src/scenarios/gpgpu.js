import { Vector3 } from 'three';
import { setParticleList, createParticle, bidimensionalMode, createParticles, randomSphericVector, randomVector } from './helpers';
import { setParticleRadius, setBoundaryDistance } from '../simulation';
import { fieldCleanup } from '../simulation';
import { cubeGenerator, random } from '../helpers';

export const gpgpu = [
    GPU_blob15,
    GPU_blob14,
    GPU_blob13,
    GPU_blob12,
    GPU_blob11,
    GPU_blob10,
    GPU_blob9,
    GPU_blob8,
    GPU_blob7,
    GPU_blob6,
    GPU_blob5,
    GPU_blob4,
    GPU_blob3,
    GPU_blob2,
    GPU_string,
    GPU_string_m20,
    GPU_string_m50,
    GPU_blob1,
    GPU_nucleiGrid,
    GPU_shootedBarrier,
];

function defaultParameters(graphics, physics, cameraDistance = 5000) {
    setParticleList(physics.particleList);
    bidimensionalMode(true);

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1.0 / 137;
    physics.nearChargeConstant = 1.0;
    physics.nearChargeRange = 1e3;

    setParticleRadius(20, 10);
    setBoundaryDistance(1e6);
}

function GPU_blob15(graphics, physics) {
    defaultParameters(graphics, physics, 1.2e6);
    fieldCleanup(graphics);
    setParticleRadius(1e3, 1e2);
    setBoundaryDistance(1e9);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 10;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = 128 * 128;

    createParticles(n,
        (i) => {
            let v = random(0, 3, true);
            /*if (v == 0) {
                return 0.5;
            }*/
            return m * v;
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nearCharge *= random(0, 1);
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

function GPU_blob14(graphics, physics) {
    defaultParameters(graphics, physics, 1.2e6);
    fieldCleanup(graphics);
    setParticleRadius(1e3, 1e2);
    setBoundaryDistance(1e9);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 100;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = 128 * 128;

    createParticles(n,
        (i) => {
            return m * random(0, 3, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nearCharge *= random(0, 1);
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

function GPU_blob13(graphics, physics) {
    defaultParameters(graphics, physics, 1.2e6);
    fieldCleanup(graphics);
    setParticleRadius(1e3, 1e2);
    setBoundaryDistance(1e9);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 10;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = 128 * 128;

    createParticles(n,
        (i) => {
            return m * random(0, 3, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nearCharge *= random(0, 1);
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

function GPU_blob12(graphics, physics) {
    defaultParameters(graphics, physics, 1.2e6);
    fieldCleanup(graphics);
    setParticleRadius(1e3, 1e2);
    setBoundaryDistance(1e9);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 10;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = 128 * 128;

    createParticles(n,
        (i) => {
            return m * random(0, 3, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nearCharge *= random(0, 1);
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

function GPU_blob11(graphics, physics) {
    defaultParameters(graphics, physics, 1.2e6);
    fieldCleanup(graphics);
    setParticleRadius(1e3, 1e2);
    setBoundaryDistance(1e9);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = 128 * 128;

    createParticles(n,
        (i) => {
            return m * random(1, 1024);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nearCharge *= random(0, 1);
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

function GPU_blob10(graphics, physics) {
    defaultParameters(graphics, physics, 1.2e6);
    fieldCleanup(graphics);
    setParticleRadius(1e3, 1e2);
    setBoundaryDistance(1e9);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = 128 * 128;

    createParticles(n,
        (i) => {
            return m * random(0, 1024, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nearCharge *= random(0, 1);
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

function GPU_blob9(graphics, physics) {
    defaultParameters(graphics, physics, 1.2e7);
    fieldCleanup(graphics);
    setParticleRadius(1e3, 1e2);
    setBoundaryDistance(1e9);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1e6;
    let v = 0;
    let n = 128 * 128;

    createParticles(n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nearCharge = nq;
            //nearCharge *= random(0, 1);
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

function GPU_blob8(graphics, physics) {
    defaultParameters(graphics, physics, 1.2e7);
    fieldCleanup(graphics);
    setParticleRadius(1e3, 1e2);
    setBoundaryDistance(1e9);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1e6;
    let v = 0;
    let n = 128 * 128;

    createParticles(n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nearCharge = nq;
            nearCharge *= random(0, 1);
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

function GPU_blob7(graphics, physics) {
    defaultParameters(graphics, physics, 1.7e6);
    fieldCleanup(graphics);
    setParticleRadius(1e3, 1e2);
    setBoundaryDistance(1e9);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = 128 * 128;

    createParticles(n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            nearCharge *= random(1, 1024, true)/1024;
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

function GPU_blob6(graphics, physics) {
    defaultParameters(graphics, physics, 1.7e6);
    fieldCleanup(graphics);
    setParticleRadius(1e3, 1e2);
    setBoundaryDistance(1e9);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = 128 * 128;

    createParticles(n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            nearCharge *= random(1, 100, true)/50;
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

function GPU_blob5(graphics, physics) {
    defaultParameters(graphics, physics, 1.7e6);
    fieldCleanup(graphics);
    setParticleRadius(1e3, 1e2);
    setBoundaryDistance(1e9);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = 128 * 128;

    createParticles(n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            nearCharge *= random(1, 100, true)/100;
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

function GPU_blob4(graphics, physics) {
    defaultParameters(graphics, physics, 1.7e6);
    fieldCleanup(graphics);
    setParticleRadius(1e3, 1e2);
    setBoundaryDistance(1e9);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = 128 * 128;

    createParticles(n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            nearCharge *= random(1, 100, true)/100;
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

function GPU_blob3(graphics, physics) {
    defaultParameters(graphics, physics, 1.7e6);
    fieldCleanup(graphics);
    setParticleRadius(1e3, 1e2);
    setBoundaryDistance(1e9);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = 128 * 128;

    createParticles(n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            nearCharge *= random(0, 1, true);
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

function GPU_blob2(graphics, physics) {
    defaultParameters(graphics, physics, 1.7e6);
    fieldCleanup(graphics);
    setParticleRadius(1e3, 1e2);
    setBoundaryDistance(1e9);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = 128 * 128;

    createParticles(n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nearCharge *= random(1, 3, true);
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

function GPU_string(graphics, physics) {
    defaultParameters(graphics, physics, 1e7);
    setBoundaryDistance(1e9);
    setParticleRadius(1e4, 1e2);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e6;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = Math.round(128*128 / 3);

    createParticles(n,
        (i) => {
            return 0.5 * m;
        },
        (i) => {
            return (random(0, 1, true)) ? (-q) : (q);
        },
        (i) => {
            return (random(0, 1, true)) ? (-nq) : (nq);
            //return 0;
        },
        (i) => {
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );

    createParticles(n,
        (i) => {
            return 3 * m;
        },
        (i) => {
            return (random(0, 1, true)) ? (-2 * q / 3) : (2 * q / 3);
        },
        (i) => {
            return (random(0, 1, true)) ? (-3 * nq) : (3 * nq);
        },
        (i) => {
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );

    createParticles(n,
        (i) => {
            return 6 * m;
        },
        (i) => {
            return (random(0, 1, true)) ? (-q / 3) : (q / 3);
        },
        (i) => {
            return (random(0, 1, true)) ? (-3 * nq) : (3 * nq);
        },
        (i) => {
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}

function GPU_string_m50(graphics, physics) {
    defaultParameters(graphics, physics, 1e7);
    setBoundaryDistance(1e9);
    setParticleRadius(1e4, 1e3);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e7;

    let m = 50;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = Math.round(128*128 / 3);

    createParticles(n,
        (i) => {
            return 0.5 * m;
        },
        (i) => {
            return (random(0, 1, true)) ? (-q) : (q);
        },
        (i) => {
            return (random(0, 1, true)) ? (-nq) : (nq);
            //return 0;
        },
        (i) => {
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );

    createParticles(n,
        (i) => {
            return 3 * m;
        },
        (i) => {
            return (random(0, 1, true)) ? (-2 * q / 3) : (2 * q / 3);
        },
        (i) => {
            return (random(0, 1, true)) ? (-3 * nq) : (3 * nq);
        },
        (i) => {
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );

    createParticles(n,
        (i) => {
            return 6 * m;
        },
        (i) => {
            return (random(0, 1, true)) ? (-q / 3) : (q / 3);
        },
        (i) => {
            return (random(0, 1, true)) ? (-3 * nq) : (3 * nq);
        },
        (i) => {
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}

function GPU_string_m20(graphics, physics) {
    defaultParameters(graphics, physics, 1e7);
    setBoundaryDistance(1e9);
    setParticleRadius(1e4, 1e3);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e7;

    let m = 20;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = Math.round(128*128 / 3);

    createParticles(n,
        (i) => {
            return 0.5 * m;
        },
        (i) => {
            return (random(0, 1, true)) ? (-q) : (q);
        },
        (i) => {
            return (random(0, 1, true)) ? (-nq) : (nq);
            //return 0;
        },
        (i) => {
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );

    createParticles(n,
        (i) => {
            return 3 * m;
        },
        (i) => {
            return (random(0, 1, true)) ? (-2 * q / 3) : (2 * q / 3);
        },
        (i) => {
            return (random(0, 1, true)) ? (-3 * nq) : (3 * nq);
        },
        (i) => {
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );

    createParticles(n,
        (i) => {
            return 6 * m;
        },
        (i) => {
            return (random(0, 1, true)) ? (-q / 3) : (q / 3);
        },
        (i) => {
            return (random(0, 1, true)) ? (-3 * nq) : (3 * nq);
        },
        (i) => {
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}

function GPU_blob1(graphics, physics) {
    defaultParameters(graphics, physics, 1e4);
    fieldCleanup(graphics);
    setParticleRadius(50, 25);
    setBoundaryDistance(1e6);
    bidimensionalMode(false);

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = physics.nearChargeRange * 4;
    let v = 0;
    let n = 128 * 128;

    createParticles(n,
        (i) => {
            return m * random(1, 3, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            nearCharge *= random(1, 3, true);
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

function GPU_nucleiGrid(graphics, physics) {
    defaultParameters(graphics, physics, 10e3);
    fieldCleanup(graphics);
    setParticleRadius(50, 10);
    setBoundaryDistance(1e5);
    bidimensionalMode(true);

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1.0 / 137;
    physics.nearChargeConstant = 1.0;
    physics.nearChargeRange = 1e3;

    let m = 5e-1 / 0.511;
    let q = 3.0;
    let nq = 1.0;
    let width = 61;
    let grid = [width, Math.round(width * 9 / 16), 1];
    let r0 = physics.nearChargeRange * 0.05;
    let r1 = physics.nearChargeRange * 0.63;
    let v = 0;
    let n = 1;

    function createNuclei(n, m, q, nq, r0, r1, v, center, neutron = false) {
        //if (random(0, 1) > 0.9) return;

        createParticles(2 * n,
            (i) => {
                return 3 * m;
            },
            (i) => {
                return 2 / 3 * q;
            },
            (i) => {
                return 3 * nq;
            },
            (i) => {
                return randomSphericVector(0, r0).add(center);
            },
            (i) => {
                return randomVector(0);
            }
        );
        createParticles(1 * n,
            (i) => {
                return 6 * m;
            },
            (i) => {
                return -1 / 3 * q;
            },
            (i) => {
                return 3 * nq;
            },
            (i) => {
                return randomSphericVector(0, r0).add(center);
            },
            (i) => {
                return randomVector(0);
            }
        );

        createParticles(n,
            (i) => {
                return 0.5 * m;
            },
            (i) => {
                return -q;
            },
            (i) => {
                return -nq;
            },
            (i) => {
                return randomSphericVector(r0, r1).add(center);
            },
            (i) => {
                return randomVector(v);
            }
        );

        if (!neutron) return;

        createParticles(1 * n,
            (i) => {
                return 3 * m;
            },
            (i) => {
                return 2 / 3 * q;
            },
            (i) => {
                return 3 * nq;
            },
            (i) => {
                return randomSphericVector(0, r0).add(center);
            },
            (i) => {
                return randomVector(0);
            }
        );
        createParticles(2 * n,
            (i) => {
                return 6 * m;
            },
            (i) => {
                return -1 / 3 * q;
            },
            (i) => {
                return 3 * nq;
            },
            (i) => {
                return randomSphericVector(0, r0).add(center);
            },
            (i) => {
                return randomVector(0);
            }
        );
    }

    let aux = 0;
    cubeGenerator((x, y, z) => {
        createNuclei(
            n, m, q,
            (aux % 2 == 0) ? (nq) : (-nq),
            r0, r1,
            v, new Vector3(x, y, z),
            true
        );
        ++aux;
    }, grid[0] * r1, grid);
}

function GPU_shootedBarrier(graphics, physics) {
    defaultParameters(graphics, physics, 30e3);
    fieldCleanup(graphics);
    setParticleRadius(50, 10);
    bidimensionalMode(false);

    let m = 1 / 10;
    let q = 10;
    let nq = 1;
    let grid = [127, 9, 1];
    let r0 = physics.nearChargeRange * 1 / 100;
    let r1 = physics.nearChargeRange * 0.63;
    let v = 0;
    let n = 2;

    for (let i = 0; i < 15; i++) {
        createParticle(3, -q, nq, new Vector3(0, 1e4 + i * physics.nearChargeRange, 0), new Vector3(0, -100, 0));
    }

    let aux = 0;
    cubeGenerator((x, y, z) => {
        createParticles(n,
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
                return randomSphericVector(0, r0).add(new Vector3(x, y, z));
            },
            (i) => {
                return randomVector(v);
            }
        );
        ++aux;
    }, grid[0] * r1, grid);
}
