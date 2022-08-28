import { ArrowHelper, Vector3, Color } from 'three';
import { Particle } from './physics.js'
import { particleList, physics } from './simulation.js'
import { cubeGenerator, visibleWidthAtZDepth } from './helpers'

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
export function fieldSetup(graphics, mode = "update", grid, spacing) {
    console.log("fieldSetup");

    //graphics.cameraRefresh();

    let newGrid, newSpacing;
    
    if (mode == "2d") {
        newSpacing = visibleWidthAtZDepth(graphics.controls.getDistance(), graphics.camera) / grid / 2;
        newGrid = [
            grid,
            Math.round(grid / graphics.camera.aspect),
            1
        ];
    } else if (mode == "3d") {
        newSpacing = 250;
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

function drawField(graphics, spacing = 10, gridSize = [10, 10, 10], center = new Vector3()) {
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
    //console.log("fieldUpdate");

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
        //forceLenRel = Math.log10(1 + 9*forceLenRel);

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