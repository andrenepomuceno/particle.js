import { Vector3 } from 'three';
import { createParticle, bidimensionalMode, createParticles, randomSphericVector, randomVector } from './helpers';
import { setParticleRadius, setBoundaryDistance } from '../legacySimulation';
import { fieldSetup, fieldProbeConfig, fieldCleanup } from '../field';
import { cubeGenerator, random, sphereGenerator } from '../helpers';

export const gpgpu = [
    GPU_string,
    GPU_string_m20,
    GPU_string_m50,
    GPU_blob1,
    GPU_nucleiGrid,
    GPU_shootedBarrier,
];

function defaultParameters(graphics, physics, cameraDistance = 5000) {
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

function GPU_string_m50(graphics, physics) {
    defaultParameters(graphics, physics, 1e7);
    setBoundaryDistance(1e9);
    setParticleRadius(50, 40);
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
    setParticleRadius(50, 40);
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

function GPU_string(graphics, physics) {
    defaultParameters(graphics, physics, 1e7);
    setBoundaryDistance(1e9);
    setParticleRadius(50, 40);
    bidimensionalMode(true);

    physics.nearChargeRange = 1e7;

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

