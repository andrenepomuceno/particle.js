
import { cameraDistance, massConstant, chargeConstant, massRange, chargeRange } from './globals.js'

export function simulationAtom() {
    cameraDistance = 1000;
    //cameraPhi = cameraTheta = 0;

    /*const eMass = 9.1093837015e-31;
    const pMass = 1.67262192369e-27;
    const nMass = 1.67492749804e-27;*/

    massConstant = 1 / 1000;
    chargeConstant = 1 / 30;
    massRange = [1, 1839];
    chargeRange = [-1, 1];

    let r = 8;

    createParticles(2, [1836, 1836], [1, 1], () => {
        let pos = randomSpheric(0, r);
        return [pos[0], pos[1], pos[2]];
    });

    createParticles(2, [1839, 1839], [0, 0], () => {
        let pos = randomSpheric(0, r);
        return [pos[0], pos[1], pos[2]];
    });

    createParticles(700, [1, 1], [-1, -1], () => {
        let pos = randomSpheric(0, 16 * r);
        return [pos[0], pos[1], pos[2]];
    });
}

function simulation0() {
    cameraDistance = 5000;

    massConstant = 1;
    chargeConstant = 1;
    massRange = [1, 2];
    chargeRange = [-1, 1];

    const initialParticles = 1024;
    const radiusRange = 512;

    createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(), new Vector3());
}

function simulation1() {
    massConstant = 1;
    chargeConstant = 1;
    massRange = [1, 1];
    chargeRange = [-1, 1];

    const initialParticles = Math.round(1024 / 2);
    const radiusRange = 32;
    const x = 500;
    const y = x;
    const v = 16;

    createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(x, y, 0), new Vector3(-v, 0, 0));
    createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(-x, -y, 0), new Vector3(v, 0, 0));
}

function simulationGrid2D() {
    cameraDistance = 5000
    massConstant = 1 / 100;
    chargeConstant = 1;
    massRange = [1, 5];
    chargeRange = [-1, 1];

    const gridSize = 16;
    const spacing = 128;
    const initialParticles = Math.round(1024 / gridSize / gridSize);
    const radiusRange = 8;

    for (let i = 0; i < gridSize; ++i) {
        let cx = i - gridSize / 2 + 0.5;
        cx *= spacing;
        for (let j = 0; j < gridSize; ++j) {
            let cy = j - gridSize / 2 + 0.5;
            cy *= spacing;
            createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(cx, cy, 0), new Vector3());
        }
    }
}

function simulationGrid3D() {
    cameraDistance = 1000;
    cameraPhi = 30; cameraTheta = 45;
    massConstant = 1 / 10;
    chargeConstant = 1;
    massRange = [1, 8];
    chargeRange = [-8, 8];

    const gridSize = 4;
    const spacing = 400;
    const initialParticles = Math.round(1024 / gridSize / gridSize / gridSize);
    const radiusRange = 32;

    for (let i = 0; i < gridSize; ++i) {
        let cx = i - gridSize / 2 + 0.5;
        cx *= spacing;
        for (let j = 0; j < gridSize; ++j) {
            let cy = j - gridSize / 2 + 0.5;
            cy *= spacing;
            for (let k = 0; k < gridSize; ++k) {
                let cz = k - gridSize / 2 + 0.5;
                cz *= spacing;
                createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(cx, cy, cz), new Vector3());
            }
        }
    }
}

function simulationCross() {
    cameraDistance = 4000;
    cameraPhi = cameraTheta = 0;
    massConstant = 1 / 17;
    chargeConstant = 1;
    massRange = [1, 16];
    chargeRange = [-3, 3];

    const initialParticles = Math.round(1024 / 7);
    const radiusRange = 128;
    const space = 1000;
    const v = 12;

    createParticlesSphere(2 * initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(), new Vector3());
    createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(space, 0, 0), new Vector3(0, -v, 0));
    createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(0, space, 0), new Vector3(v, 0, 0));
    createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(-space, 0, 0), new Vector3(0, v, 0));
    createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(0, -space, 0), new Vector3(-v, 0, 0));
    createParticlesSphere(initialParticles, 0, 10000, massRange, chargeRange, new Vector3(), new Vector3());
}

function simulationSpheres() {
    cameraDistance = 3000;
    cameraPhi = cameraTheta = 0;
    massConstant = 1 / 13;
    chargeConstant = 1;
    massRange = [1, 8];
    chargeRange = [-3, 3];

    const spheres = 10;
    const initialParticles = Math.round(1024 / spheres);
    const radiusRange = 32;

    const r1 = 0;
    const r2 = 1000;

    for (var i = 0; i < spheres; ++i) {
        let [x, y, z] = randomSpheric(r1, r2);
        createParticlesSphere(initialParticles, 0, radiusRange, massRange, chargeRange, new Vector3(x, y, z), new Vector3());
    }
}
