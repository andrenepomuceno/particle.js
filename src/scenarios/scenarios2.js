import { Vector3 } from 'three';
import { setParticleList, createParticle, bidimensionalMode, createParticles, randomSphericVector, randomVector } from './helpers';
import { setParticleRadius, setBoundaryDistance } from '../simulation';
import { cubeGenerator, random } from '../helpers';

export const scenarios2 = [
    string,
    nucleiGrid,
    shootedBarrier,
    standardModelBlob2,
    standardModelBlobSymetric,
    standardModelBlob0,
];

function defaultParameters(graphics, physics, cameraDistance = 5000) {
    setParticleList(physics.particleList);
    let mode2d = true;
    bidimensionalMode(mode2d);

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();
    //if (mode2d) graphics.cameraPhi = graphics.cameraTheta = 0;

    physics.forceConstant = 1;
    physics.massConstant = 1e-9;
    physics.chargeConstant = 1 / 137;
    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e3;

    setParticleRadius(20, 10);
    setBoundaryDistance(1e6);
}

function string(graphics, physics) {
    defaultParameters(graphics, physics, 1e5);
    setBoundaryDistance(1e9);
    setParticleRadius(50, 40);
    bidimensionalMode(true);
    
    physics.nearChargeRange = 1e5;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = Math.round(1024 / 3);

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

function nucleiGrid(graphics, physics) {
    defaultParameters(graphics, physics, 10e3);
        setParticleRadius(50, 10);
    setBoundaryDistance(20e3);
    bidimensionalMode(true);

    let m = 5e-1 / 0.511;
    let q = 3;
    let nq = 1;
    let grid = [13, 13, 1];
    let r0 = physics.nearChargeRange * 0.05;
    let r1 = physics.nearChargeRange * 0.63;
    let v = 0;
    let n = 1;

    function createNuclei(n, m, q, nq, r0, r1, v, center, neutron = false) {
        createParticles(2 * n,
            (i) => {
                return 2.2 * m;
            },
            (i) => {
                return 2 / 3 * q;
            },
            (i) => {
                return nq;
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
                return 4.7 * m;
            },
            (i) => {
                return -1 / 3 * q;
            },
            (i) => {
                return nq;
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
                return 0.511 * m;
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
                return 2.2 * m;
            },
            (i) => {
                return 2 / 3 * q;
            },
            (i) => {
                return nq;
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
                return 4.7 * m;
            },
            (i) => {
                return -1 / 3 * q;
            },
            (i) => {
                return nq;
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

function shootedBarrier(graphics, physics) {
    defaultParameters(graphics, physics, 30e3);
        setParticleRadius(50, 10);

    let m = 1 / 10;
    let q = 10;
    let nq = 1;
    let grid = [59, 9, 1];
    let r0 = physics.nearChargeRange * 1 / 100;
    let r1 = physics.nearChargeRange * 0.63;
    let v = 0;
    let n = 2;

    for (let i = 0; i < 15; i++) {
        createParticle(1, -q, nq, new Vector3(0, 1e4 + i * physics.nearChargeRange, 0), new Vector3(0, -100, 0));
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

function standardModelBlob2(graphics, physics) {
    defaultParameters(graphics, physics, 15e3);
        setParticleRadius(50, 40);
    setBoundaryDistance(1e7);

    // ve m < 0.120 eV q = 0
    // e m = 0.511 MeV q = -1
    // qup m = 2.2 MeV q = 2/3
    // qdown m = 4.7 MeV q = -1/3

    let m = 1e-6;
    let q = 20;
    let nq = 1;
    let grid = [23, 22, 1];
    let r0 = physics.nearChargeRange * 4;
    let v = 0;
    let n = 1200 / 4;

    /*createParticles(n,
        (i) => {
            return 0;
        },
        (i) => {
            return 0;
        },
        (i) => {
            return (random(0, 1, true)) ? (-nq) : (nq);
        },
        (i) => {
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );*/

    createParticles(n,
        (i) => {
            return 0.12e-1;
        },
        (i) => {
            return 0;
        },
        (i) => {
            return (random(0, 1, true)) ? (-nq) : (nq);
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
            return 0.511e6 * m;
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
            return 2.2e6 * m;
        },
        (i) => {
            return (random(0, 1, true)) ? (-2 * q / 3) : (2 * q / 3);
        },
        (i) => {
            return (random(0, 1, true)) ? (-nq) : (nq);
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
            return 4.7e6 * m;
        },
        (i) => {
            return (random(0, 1, true)) ? (-q / 3) : (q / 3);
        },
        (i) => {
            return (random(0, 1, true)) ? (-nq) : (nq);
        },
        (i) => {
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}

function standardModelBlobSymetric(graphics, physics) {
    defaultParameters(graphics, physics, 15e3);
        setParticleRadius(50, 40);
    setBoundaryDistance(1e10);

    // ve m < 0.120 eV q = 0
    // e m = 0.511 MeV q = -1
    // qup m = 2.2 MeV q = 2/3
    // qdown m = 4.7 MeV q = -1/3

    let m = 1e-1;
    let q = 1;
    let nq = 1;
    let r0 = physics.nearChargeRange * 3;
    let v = 5;
    let n = 300;

    createParticles(n,
        (i) => {
            return 0.12 * m;
        },
        (i) => {
            return 0;
        },
        (i) => {
            return (random(0, 1, true)) ? (-nq) : (nq);
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
            return 0.511e6 * m;
        },
        (i) => {
            return (random(0, 1, true)) ? (-q) : (q);
        },
        (i) => {
            return (random(0, 1, true)) ? (-nq) : (nq);
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
            return 2.2e6 * m;
        },
        (i) => {
            return (random(0, 1, true)) ? (-2 * q / 3) : (2 * q / 3);
        },
        (i) => {
            return (random(0, 1, true)) ? (-nq) : (nq);
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
            return 4.7e6 * m;
        },
        (i) => {
            return (random(0, 1, true)) ? (-q / 3) : (q / 3);
        },
        (i) => {
            return (random(0, 1, true)) ? (-nq) : (nq);
        },
        (i) => {
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}

function standardModelBlob0(graphics, physics) {
    defaultParameters(graphics, physics, 15e3);
        setParticleRadius(50, 40);

    // ve m = 0.1 eV q = 0
    // e m = 0.511 MeV q = -1
    // qup m = 2.2 MeV q = 2/3
    // qdown m = 4.7 MeV q = -1/3


    let m = 1e-2;
    let me = 1e-1;

    let q = 10;
    let nq = 1;
    let grid = [23, 22, 1];
    let r0 = physics.nearChargeRange * 3;
    let v = 0;
    let n = 300;

    createParticles(n,
        (i) => {
            return m;
        },
        (i) => {
            return 0;
        },
        (i) => {
            return (random(0, 1, true)) ? (-nq) : (nq);
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
            return me;
        },
        (i) => {
            return -q;
        },
        (i) => {
            return (random(0, 1, true)) ? (-nq) : (nq);
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
            return 4 * me;
        },
        (i) => {
            return 2 * q / 3;
        },
        (i) => {
            return (random(0, 1, true)) ? (-nq) : (nq);
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
            return 9 * me;
        },
        (i) => {
            return -q / 3;
        },
        (i) => {
            return (random(0, 1, true)) ? (-nq) : (nq);
        },
        (i) => {
            return randomSphericVector(0, r0);
        },
        (i) => {
            return randomVector(v);
        }
    );
}