import { ArrowHelper, Color, MathUtils } from 'three';
import { Vector3 } from 'three';
import { Particle } from './physics.js'
import { cubeGenerator, sphereGenerator } from './helpers'

let fieldVectorList = [];

let updateProbe = {
    m: 0,
    q: 0,
    nq: 0
}
function fieldProbeConfig(m = 0, q = 0, nq = 0) {
    updateProbe.m = m;
    updateProbe.q = q;
    updateProbe.nq = nq;
}

let lastMode = "";
let lastSize = 0;
let lastGrid = [];

function viewSize(graphics) {
    var vFOV = MathUtils.degToRad(graphics.camera.fov);
    var height = 2 * Math.tan(vFOV / 2) * graphics.controls.getDistance();
    var width = height * graphics.camera.aspect;
    return [width, height];
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

function log(msg) {
    console.log("FieldCPU: " + msg);
}

export class FieldCPU {
    constructor(graphics, physics) {
        this.graphics = graphics;
        this.physics = physics;
        this.particleList = physics.particleList;
    }

    setup(mode, grid, size) {
        log("fieldSetup");
        log("mode = " + mode);

        //graphics.cameraRefresh();

        let newGrid, newSize;

        if (mode == "2d") {
            let [w, _] = viewSize(this.graphics);
            newSize = w;
            newGrid = [
                grid,
                Math.round(grid / this.graphics.camera.aspect),
                1
            ];
        } else if (mode == "3d") {
            let [w, h] = viewSize(this.graphics);
            newSize = Math.min(w, h);
            newGrid = [
                grid,
                grid,
                grid
            ];
        } else if (mode == "update") {
            return this.setup(lastMode, lastGrid, lastSize)
        }

        let center = this.graphics.controls.target.clone();
        this.#drawField(newSize, newGrid, center);
        this.update();

        lastMode = mode;
        lastGrid = grid;
        lastSize = size;

        console.log("fieldSetup done");
    }

    probeConfig(m, q, nq) {
        log("probeConfig");
        fieldProbeConfig(m, q, nq);
    }

    update() {
        // log("update");
        let probe = new Particle();
        probe.mass = updateProbe.m;
        probe.charge = updateProbe.q;
        probe.nearCharge = updateProbe.nq;
        fieldVectorList.forEach((pos) => {
            probe.position = pos;
            let force = this.probe(probe);
            fieldGeometryUpdate(pos, force);
        });
    }

    cleanup() {
        log("cleanup");
        fieldVectorList.forEach((pos) => {
            this.graphics.scene.remove(pos.geometry);
        });
        fieldVectorList = [];
    }

    probe(probleParticle) {
        probleParticle.force.setScalar(0);

        this.particleList.forEach((p, idx) => {
            //if (p.position.clone().sub(probleParticle.position).length() > 5e3) return;
            this.physics.interact(probleParticle, p, true);
            p.force.setScalar(0);
        });

        return probleParticle.force;
    }

    #drawField(size = 1e3, gridSize = [10, 10, 10], center = new Vector3(), mode = "cube") {
        console.log("#drawField");
    
        this.cleanup();
    
        let spacing = size / gridSize[0];
        let len = spacing / 2;
        if (gridSize[2] > 1) {
            len /= 2;
        }
    
        switch (mode) {
            case "sphere":
                sphereGenerator((x, y, z) => {
                    let pos = new Vector3(x, y, z).add(center);
                    fieldVectorList.push(pos);
                    pos.geometry = newFieldGeometry(pos, len);
                    this.graphics.scene.add(pos.geometry);
                }, size, gridSize);
                break;
    
            case "cube":
            default:
                cubeGenerator((x, y, z) => {
                    let pos = new Vector3(x, y, z).add(center);
                    fieldVectorList.push(pos);
                    pos.geometry = newFieldGeometry(pos, len);
                    this.graphics.scene.add(pos.geometry);
                }, size, gridSize);
                break;
        }
    }
}