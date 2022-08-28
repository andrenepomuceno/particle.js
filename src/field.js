import { ArrowHelper, Vector3, Color } from 'three';
import { Particle } from './physics.js'
import { particleList, physics } from './simulation.js'
import { cubeGenerator } from './helpers'

let fieldVectorList = [];

let updateProbe = {
    m: 0,
    q: 0,
    nq: 0
}
export function fieldProbeConfig(m = 0, q = 0, nq = 0) {
    updateProbe.m = m;
    updateProbe.q = q;
    updateProbe.nq = nq;
}

const visibleHeightAtZDepth = (depth, camera) => {
    // compensate for cameras not positioned at z=0
    const cameraOffset = camera.position.z;
    if (depth < cameraOffset) depth -= cameraOffset;
    else depth += cameraOffset;
    // vertical fov in radians
    const vFOV = camera.fov * Math.PI / 180;
    // Math.abs to ensure the result is always positive
    return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

const visibleWidthAtZDepth = (depth, camera) => {
    const height = visibleHeightAtZDepth(depth, camera);
    return height * camera.aspect;
};

export function fieldSetup(graphics, grid = 51) {
    console.log("fieldSetup");

    graphics.cameraRefresh();
    //graphics.cameraSetup();

    let center = graphics.controls.target.clone();
    let spacing = visibleWidthAtZDepth(graphics.controls.getDistance(), graphics.camera) / grid / 2;
    let gridArray = [
        grid,
        Math.round(grid / graphics.camera.aspect),
        1
    ];
    drawField(graphics, spacing, gridArray, center);

    fieldUpdate();

    console.log("fieldSetup done");
}

export function drawField(graphics, spacing = 10, gridSize = [10, 10, 10], center = new Vector3()) {
    console.log("drawField");

    fieldCleanup(graphics);

    let len = spacing / 2;
    let headh = len / 2;
    let headw = headh / 2

    cubeGenerator((x, y, z) => {
        let pos = new Vector3(x, y, z).add(center);
        fieldVectorList.push(pos);
        pos.arrow = new ArrowHelper(
            new Vector3(1, 0, 0),
            pos,
            len,
            0xffffff,
            headh,
            headw
        );
        graphics.scene.add(pos.arrow);
    }, spacing, gridSize);
}

export function fieldCleanup(graphics) {
    fieldVectorList.forEach((pos) => {
        graphics.scene.remove(pos.arrow);
    });
    fieldVectorList = [];
}

export function fieldUpdate() {
    console.log("fieldUpdate");

    const forceMin = 0;
    const forceMax = 1e3;

    let probe = new Particle();
    probe.mass = updateProbe.m;
    probe.charge = updateProbe.q;
    probe.nearCharge = updateProbe.nq;
    fieldVectorList.forEach((pos) => {
        probe.position = pos;
        let force = fieldProbe(probe);

        let forceLen = force.length();
        if (forceLen > forceMax) forceLen = forceMax;
        else if (forceLen < forceMin) forceLen = forceMin;
        let forceLenRel = (forceLen - forceMin) / (forceMax - forceMin);

        if (forceLenRel < 1e-3)
            pos.arrow.setColor(new Color('hsl(0, 100%, ' + Math.round(50e3 * forceLenRel) + '%)'));
        else if (forceLenRel < 0.99)
            pos.arrow.setColor(new Color('hsl(' + 360 * forceLenRel + ', 100%, 50%)'));
        else
            pos.arrow.setColor(new Color(0xffffff));

        force.normalize();
        pos.arrow.setDirection(force);
    });
}

export function fieldProbe(probe) {
    probe.force.setScalar(0);

    particleList.forEach((p, idx) => {
        //if (p.position.clone().sub(probe.position).length() > 5e3) return;
        physics.interact(probe, p, true);
        p.force.setScalar(0);
    });

    return probe.force;
}