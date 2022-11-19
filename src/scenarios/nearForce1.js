import { Vector3 } from 'three';
import { createParticle, createParticles, randomSphericVector, randomVector } from './helpers';
import { setParticleRadius, setBoundaryDistance, bidimensionalMode } from '../simulation';
import { fieldCleanup } from '../simulation';
import { cubeGenerator, random } from '../helpers';

export const nearForce1 = [
    cloud2,
    cloud1,
    cloud0,
    triforce2,
    triforce1,
    triforce0,
    charge_nearCharge_point0,
    GPU_point14,
    GPU_point13,
    GPU_point12,
    GPU_point11,
    GPU_point10,
    GPU_blob9_posNQ,
    GPU_blob8_posNQ_rng,
    GPU_point7,
    GPU_point6,
    GPU_point5,
    GPU_point4,
    GPU_point3,
    GPU_point2,
];

function defaultParameters(simulation, cameraDistance = 5000) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1.0 / 137;
    physics.nearChargeConstant = 1.0;
    physics.nearChargeRange = 1e3;

    simulation.setParticleRadius(20, 10);
    simulation.physics.boundaryDistance = 1e6;
    simulation.bidimensionalMode(true);
}

function cloud2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 2e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(5e3, 1e3);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 1;
    physics.chargeConstant = 1;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = physics.nearChargeRange;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticles(n,
        (i) => {
            /*if (random(0, 1) <= massThreshold) {
                return 0.0;
            }*/
            return m * random(1, 3, true);
            //return m * random(0, 1);
            return m;
        },
        (i) => {
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

function cloud1(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1e4);
    fieldCleanup(graphics);
    simulation.setParticleRadius(50, 25);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e3;
    physics.massConstant = 1;
    physics.chargeConstant = 1;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 8 * physics.nearChargeRange;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticles(n,
        (i) => {
            /*let v = random(0, 1);
            if (v > massThreshold) {
                return m * random(1, 3, true);
                //return m * random(0, 1);
            } else {
                return 0.0;
            }*/
            return m * random(1, 3, true);
            //return m * random(0, 1);
            return m;
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            charge *= random(1, 3, true);
            //charge *= random(0, 1);
            return charge;
        },
        (i) => {
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

function cloud0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(2e3, 5e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e5;
    physics.massConstant = 1;
    physics.chargeConstant = 1;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1e6;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticles(n,
        (i) => {
            /*let v = random(0, 1);
            if (v > massThreshold) {
                return m * random(1, 3, true);
                //return m * random(0, 1);
            } else {
                return 0.0;
            }*/
            return m * random(1, 3, true);
            //return m * random(0, 1);
            return m;
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            charge *= random(1, 3, true);
            //charge *= random(0, 1);
            return charge;
        },
        (i) => {
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

function triforce2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 2e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(2e3, 5e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 1;
    physics.chargeConstant = 1;

    let m = 1/3;
    let q = 1/3;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticles(n,
        (i) => {
            /*let v = random(0, 1);
            if (v > massThreshold) {
                return m * random(1, 3, true);
                //return m * random(0, 1);
            } else {
                return 0.0;
            }*/
            return m * random(1, 3, true);
            //return m * random(0, 1);
            return m;
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            charge *= random(1, 3, true);
            //charge *= random(0, 1);
            return charge;
        },
        (i) => {
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


function triforce1(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1e7);
    fieldCleanup(graphics);
    simulation.setParticleRadius(2e3, 5e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 1;
    physics.chargeConstant = 1;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticles(n,
        (i) => {
            /*let v = random(0, 1);
            if (v > massThreshold) {
                return m * random(1, 3, true);
                //return m * random(0, 1);
            } else {
                return 0.0;
            }*/
            return m * random(1, 3, true);
            //return m * random(0, 1);
            return m;
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            charge *= random(1, 3, true);
            //charge *= random(0, 1);
            return charge;
        },
        (i) => {
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

function triforce0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(2e3, 5e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 1;
    physics.chargeConstant = 1;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticles(n,
        (i) => {
            /*let v = random(0, 1);
            if (v > massThreshold) {
                return m * random(1, 3, true);
                //return m * random(0, 1);
            } else {
                return 0.0;
            }*/
            //return m * random(1, 3, true);
            //return m * random(0, 1);
            return m;
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            charge *= random(1, 3, true);
            //charge *= random(0, 1);
            return charge;
        },
        (i) => {
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

function charge_nearCharge_point0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(2e3, 5e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 1e-6;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticles(n,
        (i) => {
            /*let v = random(0, 1);
            if (v > massThreshold) {
                return m * random(1, 3, true);
                //return m * random(0, 1);
            } else {
                return 0.0;
            }*/
            //return m * random(1, 3, true);
            //return m * random(0, 1);
            return m;
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            //charge *= random(0, 1);
            return charge;
        },
        (i) => {
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

function GPU_point14(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 100;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

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

function GPU_point13(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 10;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

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

function GPU_point12(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 10;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

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

function GPU_point11(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

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

function GPU_point10(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

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

function GPU_blob9_posNQ(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e7);
    fieldCleanup(graphics);
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1e6;
    let v = 0;
    let n = graphics.maxParticles;

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

function GPU_blob8_posNQ_rng(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e7);
    fieldCleanup(graphics);
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1e6;
    let v = 0;
    let n = graphics.maxParticles;

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

function GPU_point7(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.7e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

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
            nearCharge *= random(1, 1024, true) / 1024;
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

function GPU_point6(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.7e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

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
            nearCharge *= random(1, 100, true) / 50;
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

function GPU_point5(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.7e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

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
            nearCharge *= random(1, 100, true) / 100;
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

function GPU_point4(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.7e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

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
            nearCharge *= random(1, 100, true) / 100;
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

function GPU_point3(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.7e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

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

function GPU_point2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.7e6);
    fieldCleanup(graphics);
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nearChargeRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

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