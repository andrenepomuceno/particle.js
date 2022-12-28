import { drawGrid } from './helpers';

export const sandbox = [
    sandbox0,
];

function defaultParameters(simulation, cameraDistance = 1e4) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    ;

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nuclearForceConstant = 1;
    physics.nuclearForceRange = 1e3;

    physics.boundaryDistance = 1e5;
    physics.boundaryDamping = 0.9;
    physics.minDistance2 = Math.pow(1, 2);

    simulation.setParticleRadius(50, 25);
    simulation.bidimensionalMode(true);
}

function sandbox0(simulation) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    defaultParameters(simulation);

    //graphics.setMaxParticles(10e3);

    drawGrid(simulation, 10);

    /*let radius = physics.boundaryDistance;
    let gridPolar = new PolarGridHelper(radius, 8, divisions/2);
    gridPolar.geometry.rotateX( Math.PI / 2 );
    gridPolar.geometry.translate(0, 0, z);
    graphics.scene.add(gridPolar);*/
}