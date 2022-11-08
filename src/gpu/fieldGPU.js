import { ArrowHelper, Color, MathUtils } from 'three';
import { Vector3 } from 'three';
import { Particle } from '../physics.js'
import { cubeGenerator, sphereGenerator } from '../helpers'
import { maxParticles } from './graphicsGPU.js';
import { ParticleType } from '../physics'

function viewSize(graphics) {
    var vFOV = MathUtils.degToRad(graphics.camera.fov);
    var height = 2 * Math.tan(vFOV / 2) * graphics.controls.getDistance();
    var width = height * graphics.camera.aspect;
    return [width, height];
}

function newArrowObject(pos, len) {
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

function updateArrow(object) {
    const forceMin = 0;
    const forceMax = 1e3;

    let force = object.particle.velocity.clone();

    let forceLen = force.length();
    if (forceLen > forceMax) forceLen = forceMax;
    else if (forceLen < forceMin) forceLen = forceMin;
    let forceLenRel = (forceLen - forceMin) / (forceMax - forceMin);
    //forceLenRel = Math.log10(1 + 9*forceLenRel);

    if (forceLenRel < 1e-3)
        object.setColor(new Color('hsl(0, 100%, ' + Math.round(50e3 * forceLenRel) + '%)'));
    else if (forceLenRel < 0.99)
        object.setColor(new Color('hsl(' + 360 * forceLenRel + ', 100%, 50%)'));
    else
        object.setColor(new Color(0xffffff));

    force.normalize();
    object.setDirection(force);
}

function log(msg) {
    console.log("FieldGPU: " + msg);
}

export class FieldGPU {
    constructor(graphics, physics) {
        this.graphics = graphics;
        this.physics = physics;
        this.particleList = physics.particleList;

        this.grid = undefined;
        this.size = undefined;
        this.mode = undefined;
        this.probeParam = { m: 1, q: 1, nq: 1 };
        this.firstProbeIdx = undefined;

        this.objectList = [];
    }

    setup(mode, gridPoints) {
        log("setup");
        log("mode = " + mode);

        if (mode == "2d") {
            let [w, _] = viewSize(this.graphics);
            this.size = w;
            this.grid = [
                gridPoints,
                Math.round(gridPoints / this.graphics.camera.aspect),
                1
            ];
        } else if (mode == "3d") {
            let [w, h] = viewSize(this.graphics);
            this.size = Math.min(w, h);
            this.grid = [
                gridPoints,
                gridPoints,
                gridPoints
            ];
        } else if (mode == "update") {
            //return this.update();
            return; // not suported
        }

        this.mode = mode;
        let center = this.graphics.controls.target.clone();
        this.#populateField(this.size, this.grid, center);

        console.log("setup done");
    }

    probeConfig(m = 1, q = 1, nq = 1) {
        log("probeConfig");
        this.probeParam = {
            m: m,
            q: q,
            nq: nq
        }
    }

    update() {
        //log("update");

        //this.graphics.readbackParticleData();

        this.objectList.forEach((obj) => {
            updateArrow(obj);
        })
    }

    cleanup() {
        log("cleanup");

        this.objectList.forEach(obj => {
            this.particleList.pop(obj.particle);
            this.graphics.scene.remove(obj);
        })

        this.objectList = [];

        this.probeConfig();
    }

    probe(probeParticle) {
        //log("probe");
        return new Vector3();
        
        probeParticle.force.setScalar(0);
        this.particleList.forEach((p, idx) => {
            //if (p.position.clone().sub(probleParticle.position).length() > 5e3) return;
            if (p.type == ParticleType.default)
                this.physics.interact(probeParticle, p, true);
            p.force.setScalar(0);
        });
        return probeParticle.force;
    }

    #populateField(size = 1e3, gridSize = [10, 10, 10], center = new Vector3(), mode = "cube") {
        console.log("#populateField");

        let probeCount = gridSize[0] * gridSize[1] * gridSize[2];
        if (this.particleList.length + probeCount > maxParticles) {
            log("error: too many probes: " + probeCount);
            log("free: " + (maxParticles - this.particleList.length));
        }
        console.log("probeCount = " + probeCount);

        let spacing = size / gridSize[0];
        let len = spacing / 2;
        if (gridSize[2] > 1) {
            len /= 2;
        }

        this.firstProbeIdx = this.particleList.length - 1;

        switch (mode) {
            case "sphere":
                sphereGenerator((x, y, z) => {
                    this.#createFieldElement(new Vector3(x, y, z).add(center), len);
                }, size, gridSize);
                break;

            case "cube":
            default:
                cubeGenerator((x, y, z) => {
                    this.#createFieldElement(new Vector3(x, y, z).add(center), len);
                }, size, gridSize);
                break;
        }
    }

    #createFieldElement(position, len) {
        let p = new Particle();
        p.type = ParticleType.probe;
        p.mass = this.probeParam.m;
        p.charge = this.probeParam.q;
        p.nearCharge = this.probeParam.nq;
        p.position = position;
        p.radius = len * 0.75;
        this.particleList.push(p);

        /*let obj = newArrowObject(position, len);
        obj.particle = p;
        this.objectList.push(obj);
        this.graphics.scene.add(obj);*/
    }
}