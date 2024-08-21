import { createParticlesList, randomVector } from '../scenariosHelpers';
import { random } from '../helpers';
import { randomSphericVector } from '../helpers';

export const nuclearForce1 = [
    cloud2,
    cloud1,
    //cloud0,
    triforce2,
    triforce1,
    //triforce0,
    //charge_nuclearCharge_point0,
    //GPU_point14,
    //GPU_point13,
    //GPU_point12,
    //GPU_point11,
    GPU_point10,
    GPU_blob9_posNQ,
    //GPU_blob8_posNQ_rng,
    GPU_point7,
    //GPU_point6,
    //GPU_point5,
    //GPU_point4,
    //GPU_point3,
    //GPU_point2,
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
    physics.nuclearForceConstant = 1.0;
    physics.nuclearForceRange = 1e3;

    simulation.setParticleRadius(20, 10);
    simulation.physics.boundaryDistance = 1e6;
    simulation.bidimensionalMode(true);
}

function cloud2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 2e6);
    ;
    simulation.setParticleRadius(5e3, 1e3);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 1;
    physics.chargeConstant = 1;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = physics.nuclearForceRange;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticlesList(physics.particleList, n,
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
            let nuclearCharge = seq[i % 4];*/
            
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nuclearCharge *= random(1, 2, true);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function cloud1(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1e4);
    ;
    simulation.setParticleRadius(50, 25);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e3;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 8 * physics.nuclearForceRange;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticlesList(physics.particleList, n,
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
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nuclearCharge *= random(1, 2, true);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function cloud0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1e6);
    ;
    simulation.setParticleRadius(2e3, 5e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e5;
    physics.massConstant = 1;
    physics.chargeConstant = 1;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1e6;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticlesList(physics.particleList, n,
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
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nuclearCharge *= random(1, 2, true);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function triforce2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 2e6);
    ;
    simulation.setParticleRadius(2e3, 5e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 1;
    physics.chargeConstant = 1;

    let m = 1/3;
    let q = 1/3;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticlesList(physics.particleList, n,
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
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nuclearCharge *= random(1, 2, true);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}


function triforce1(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1e7);
    ;
    simulation.setParticleRadius(2e3, 5e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 1;
    physics.chargeConstant = 1;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticlesList(physics.particleList, n,
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
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nuclearCharge *= random(1, 2, true);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function triforce0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e6);
    ;
    simulation.setParticleRadius(2e3, 5e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 1;
    physics.chargeConstant = 1;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticlesList(physics.particleList, n,
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
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nuclearCharge *= random(1, 2, true);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function charge_nuclearCharge_point0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e6);
    ;
    simulation.setParticleRadius(2e3, 5e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 1e-6;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    const massThreshold = 0.2;
    createParticlesList(physics.particleList, n,
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
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nuclearCharge *= random(1, 2, true);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function GPU_point14(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e6);
    ;
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 100;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    createParticlesList(physics.particleList, n,
        (i) => {
            return m * random(0, 3, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nuclearCharge *= random(0, 1);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function GPU_point13(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e6);
    ;
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 10;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    createParticlesList(physics.particleList, n,
        (i) => {
            return m * random(0, 3, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nuclearCharge *= random(0, 1);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function GPU_point12(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e6);
    ;
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 10;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    createParticlesList(physics.particleList, n,
        (i) => {
            return m * random(0, 3, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nuclearCharge *= random(0, 1);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function GPU_point11(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e6);
    ;
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    createParticlesList(physics.particleList, n,
        (i) => {
            return m * random(1, 1024);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nuclearCharge *= random(0, 1);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function GPU_point10(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e6);
    ;
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    createParticlesList(physics.particleList, n,
        (i) => {
            return m * random(0, 1024, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nuclearCharge *= random(0, 1);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function GPU_blob9_posNQ(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e7);
    ;
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1e6;
    let v = 0;
    let n = graphics.maxParticles;

    createParticlesList(physics.particleList, n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nuclearCharge = nq;
            //nuclearCharge *= random(0, 1);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function GPU_blob8_posNQ_rng(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.2e7);
    ;
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1e6;
    let v = 0;
    let n = graphics.maxParticles;

    createParticlesList(physics.particleList, n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nuclearCharge = nq;
            nuclearCharge *= random(0, 1);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function GPU_point7(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.7e6);
    ;
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    createParticlesList(physics.particleList, n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            nuclearCharge *= random(1, 1024, true) / 1024;
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function GPU_point6(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.7e6);
    ;
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    createParticlesList(physics.particleList, n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            nuclearCharge *= random(1, 100, true) / 50;
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function GPU_point5(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.7e6);
    ;
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    createParticlesList(physics.particleList, n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            nuclearCharge *= random(1, 100, true) / 100;
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function GPU_point4(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.7e6);
    ;
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    createParticlesList(physics.particleList, n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            nuclearCharge *= random(1, 100, true) / 100;
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function GPU_point3(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.7e6);
    ;
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    createParticlesList(physics.particleList, n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            nuclearCharge *= random(0, 1, true);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}

function GPU_point2(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation, 1.7e6);
    ;
    simulation.setParticleRadius(1e3, 1e2);
    simulation.physics.boundaryDistance = 1e9;
    
    physics.nuclearForceRange = 1e6;
    physics.massConstant = 0;
    physics.chargeConstant = 0;

    let m = 1;
    let q = 1;
    let nq = 1;
    let r0 = 1;
    let v = 0;
    let n = graphics.maxParticles;

    createParticlesList(physics.particleList, n,
        (i) => {
            return m;// * random(1, 1, true);
        },
        (i) => {
            let charge = (random(0, 1, true)) ? (-q) : (q);
            //charge *= random(1, 3, true);
            return charge;
        },
        (i) => {
            let nuclearCharge = (random(0, 1, true)) ? (-nq) : (nq);
            //nuclearCharge *= random(1, 3, true);
            return nuclearCharge;
        },
        (i) => {
            return randomSphericVector(0, r0, simulation.mode2D);
        },
        (i) => {
            return randomVector(v, simulation.mode2D);
        }
    );
}