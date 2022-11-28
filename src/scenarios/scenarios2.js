import { Vector3 } from 'three';
import { createParticleList, createParticlesList, randomSphericVector, randomVector } from './helpers';
import { cubeGenerator, random } from '../helpers';

export const scenarios2 = [
    //string,
    nucleiGrid,
    shootedBarrier,
    standardModelBlob2,
    //standardModelBlobSymetric,
    standardModelBlob0,
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
    physics.massConstant = 1e-9;
    physics.chargeConstant = 1 / 137;
    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e3;

    simulation.setParticleRadius(20, 10);
    simulation.physics.boundaryDistance = 1e6;
}

function string(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1e5);
    simulation.physics.boundaryDistance = 1e9;
    simulation.setParticleRadius(50, 40);
    simulation.bidimensionalMode(true);
    
    physics.nearChargeRange = 1e5;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = Math.round(1024 / 3);

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function nucleiGrid(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 10e3);
        simulation.setParticleRadius(50, 10);
    simulation.physics.boundaryDistance = 20e3;
    simulation.bidimensionalMode(true);

    let m = 5e-1 / 0.511;
    let q = 3;
    let nq = 1;
    let grid = [13, 13, 1];
    let r0 = physics.nearChargeRange * 0.05;
    let r1 = physics.nearChargeRange * 0.63;
    let v = 0;
    let n = 1;

    function createNuclei(n, m, q, nq, r0, r1, v, center, neutron = false) {
        createParticlesList(physics.particleList, 2 * n,
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
                return randomSphericVector(0, r0).add(center, simulation.mode2D);
            },
            (i) => {
                return randomVector(0, simulation.mode2D);
            }
        );
        createParticlesList(physics.particleList, 1 * n,
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
                return randomSphericVector(0, r0).add(center, simulation.mode2D);
            },
            (i) => {
                return randomVector(0, simulation.mode2D);
            }
        );

        createParticlesList(physics.particleList, n,
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
                return randomSphericVector(r0, r1).add(center, simulation.mode2D);
            },
            (i) => {
                return randomVector(v, simulation.mode2D);
            }
        );

        if (!neutron) return;

        createParticlesList(physics.particleList, 1 * n,
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
                return randomSphericVector(0, r0).add(center, simulation.mode2D);
            },
            (i) => {
                return randomVector(0, simulation.mode2D);
            }
        );
        createParticlesList(physics.particleList, 2 * n,
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
                return randomSphericVector(0, r0).add(center, simulation.mode2D);
            },
            (i) => {
                return randomVector(0, simulation.mode2D);
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

function shootedBarrier(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 30e3);
        simulation.setParticleRadius(50, 10);

    let m = 1 / 10;
    let q = 10;
    let nq = 1;
    let grid = [59, 9, 1];
    let r0 = physics.nearChargeRange * 1 / 100;
    let r1 = physics.nearChargeRange * 0.63;
    let v = 0;
    let n = 2;

    for (let i = 0; i < 15; i++) {
        createParticleList(physics.particleList, 1, -q, nq, new Vector3(0, 1e4 + i * physics.nearChargeRange, 0), new Vector3(0, -100, 0));
    }

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

function standardModelBlob2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 15e3);
        simulation.setParticleRadius(50, 40);
    simulation.physics.boundaryDistance = 1e7;

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

    /*createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );*/

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function standardModelBlobSymetric(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 15e3);
        simulation.setParticleRadius(50, 40);
    simulation.physics.boundaryDistance = 1e10;

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

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function standardModelBlob0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 15e3);
        simulation.setParticleRadius(50, 40);

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

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );

    createParticlesList(physics.particleList, n,
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
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}