import { GridHelper, PolarGridHelper, Vector3 } from 'three';
import { createParticleList, randomSphericVector, randomVector, createNuclei } from './helpers';
import { random, hexagonGenerator, shuffleArray, cubeGenerator } from '../helpers';

export const sandbox = [
    sandbox0,
];

function defaultParameters(simulation, cameraDistance = 1e4) {
    let graphics = simulation.graphics;
    let physics = simulation.physics;
    simulation.fieldCleanup();

    graphics.cameraDistance = cameraDistance;
    graphics.cameraPhi = graphics.cameraTheta = 0;
    graphics.cameraSetup();

    physics.forceConstant = 1.0;
    physics.massConstant = 1e-3;
    physics.chargeConstant = 1;
    physics.nearChargeConstant = 1;
    physics.nearChargeRange = 1e3;

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

    graphics.setMaxParticles(10e3);

    let size = 2 * physics.boundaryDistance;
    let divisions = Math.round(size/10e3);
    let gridHelper = new GridHelper(size, divisions);
    let z = -1;
    gridHelper.geometry.rotateX( Math.PI / 2 );
    gridHelper.geometry.translate(0, 0, z);
    graphics.scene.add(gridHelper);

    let radius = physics.boundaryDistance;
    let gridPolar = new PolarGridHelper(radius, 8, divisions/2);
    gridPolar.geometry.rotateX( Math.PI / 2 );
    gridPolar.geometry.translate(0, 0, z);
    graphics.scene.add(gridPolar);
}