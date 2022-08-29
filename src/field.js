import { ArrowHelper, Vector3, Color, MathUtils } from 'three';
import { Particle } from './physics.js'
import { particleList, physics } from './simulation.js'
import { cubeGenerator, sphereGenerator, visibleWidthAtZDepth } from './helpers'

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

let lastMode = "";
let lastSpacing = 0;
let lastGrid = [];

function viewSize(graphics) {
    var vFOV = MathUtils.degToRad(graphics.camera.fov);
    var height = 2 * Math.tan(vFOV / 2) * graphics.controls.getDistance();
    var width = height * graphics.camera.aspect;
    return [width, height];
}

export function fieldSetup(graphics, mode = "update", grid, spacing) {
    console.log("fieldSetup");

    //graphics.cameraRefresh();

    let newGrid, newSpacing;

    if (mode == "2d") {
        let [w, _] = viewSize(graphics);
        newSpacing = w / grid;
        newGrid = [
            grid,
            Math.round(grid / graphics.camera.aspect),
            1
        ];
    } else if (mode == "3d") {
        let [w, _] = viewSize(graphics);
        newSpacing = w / grid / 3;
        newGrid = [
            grid,
            grid,
            grid
        ];
    } else if (mode == "update") {
        return fieldSetup(graphics, lastMode, lastGrid, lastSpacing)
    }

    let center = graphics.controls.target.clone();
    drawField(graphics, newSpacing, newGrid, center);
    fieldUpdate();

    lastMode = mode;
    lastGrid = grid;
    lastSpacing = spacing;

    console.log("fieldSetup done");
}

export function fieldUpdate() {
    let probe = new Particle();
    probe.mass = updateProbe.m;
    probe.charge = updateProbe.q;
    probe.nearCharge = updateProbe.nq;
    fieldVectorList.forEach((pos) => {
        probe.position = pos;
        let force = fieldProbe(probe);
        fieldGeometryUpdate(pos, force);
    });
}

export function fieldCleanup(graphics) {
    fieldVectorList.forEach((pos) => {
        graphics.scene.remove(pos.geometry);
    });
    fieldVectorList = [];
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

function drawField(graphics, spacing = 10, gridSize = [10, 10, 10], center = new Vector3()) {
    console.log("drawField");

    fieldCleanup(graphics);

    let len = spacing / 2;
    if (gridSize[2] > 1) {
        len /= 2;
    }

    cubeGenerator((x, y, z) => {
        let pos = new Vector3(x, y, z).add(center);
        fieldVectorList.push(pos);
        pos.geometry = newFieldGeometry(pos, len);
        graphics.scene.add(pos.geometry);
    }, spacing, gridSize);

    // sphereGenerator((x, y, z) => {
    //     let pos = new Vector3(x, y, z).add(center);
    //     fieldVectorList.push(pos);
    //     pos.geometry = newFieldGeometry(pos, len);
    //     graphics.scene.add(pos.geometry);
    // }, spacing*gridSize[0]/2, [gridSize[0], gridSize[0], gridSize[2]]);
}

function newFieldGeometry(pos, len) {
    let headh = len / 2;
    let headw = headh / 2
    return new ArrowHelper(
        new Vector3(1, 0, 0),
        pos,
        len,
        0xffffff,
        headh,
        headw
    );
}

function fieldGeometryUpdate(pos, force) {
    const forceMin = 0;
    const forceMax = 1e3;

    let forceLen = force.length();
    if (forceLen > forceMax) forceLen = forceMax;
    else if (forceLen < forceMin) forceLen = forceMin;
    let forceLenRel = (forceLen - forceMin) / (forceMax - forceMin);
    //forceLenRel = Math.log10(1 + 9*forceLenRel);

    if (forceLenRel < 1e-3)
        pos.geometry.setColor(new Color('hsl(0, 100%, ' + Math.round(50e3 * forceLenRel) + '%)'));
    else if (forceLenRel < 0.99)
        pos.geometry.setColor(new Color('hsl(' + 360 * forceLenRel + ', 100%, 50%)'));
    else
        pos.geometry.setColor(new Color(0xffffff));

    force.normalize();
    pos.geometry.setDirection(force);
}