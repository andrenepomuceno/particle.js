import { Vector3 } from 'three';
import { cubeGenerator, sphereGenerator, viewSize } from '../helpers'
import { Particle, ParticleType } from '../particle.js';

function log(msg) {
    console.log("Field: " + msg);
}

const arrowPadding = 0.9;

export class FieldGPU {
    constructor(simulation) {
        log('constructor');

        this.simulation = simulation;
        this.graphics = simulation.graphics;
        this.physics = simulation.physics;
        this.particleList = this.physics.particleList;

        this.grid = [50, 50, 1];
        this.size = undefined;
        this.mode = '2d';
        this.populateMode = undefined;
        this.probeParam = { m: 1, q: 1, nq: 1 };
        this.firstProbeIdx = undefined;

        this.arrowList = [];

        this.enabled = false;
        this.maxVelocity = 0.0;
        this.avgVelocity = 0.0;
        this.avgList = [];
        this.varList = [];
    }

    calcGridSize(width) {
        let size = 0;
        let grid = undefined;

        log("width = " + width);

        switch (this.mode) {
            default:
            case '2d':
                {
                    let [w, _] = viewSize(this.graphics);
                    size = w;
                    grid = [
                        width,
                        Math.round(width / this.graphics.camera.aspect),
                        1
                    ];
                }
                break;

            case '3d':
                {
                    let [w, h] = viewSize(this.graphics);
                    size = Math.min(w, h);
                    grid = [
                        width,
                        width,
                        width
                    ];
                }
                break;
        }
        return {
            size,
            grid
        }
    }

    probeConfig(m = 1, q = 1, nq = 1) {
        log('probeConfig');
        this.probeParam = {
            m: m,
            q: q,
            nq: nq
        }
    }

    setup(mode, grid, center) {
        log('setup');
        log("mode = " + mode);
        log("gridPoints = " + grid);

        if (center == undefined) center = this.simulation.graphics.controls.target.clone();
        this.mode = mode;

        let ret = this.calcGridSize(grid);
        this.size = ret.size;
        this.grid = ret.grid;

        if (!this.#populateField(center)) {
            log('setup failed');
            return false;
        }

        this.enabled = true;

        return true;
    }

    resize(center) {
        log('resize');
        //console.log(center);

        if (this.arrowList.length == 0) return;

        let ret = this.calcGridSize(this.grid[0]);
        this.size = ret.size;

        let idx = 0;
        switch (this.populateMode) {
            case 'sphere':
                sphereGenerator((x, y, z) => {
                    this.#updateFieldElement(this.arrowList[idx++], x, y, z, center);
                }, this.size, this.grid);
                break;

            case 'cube':
            default:
                cubeGenerator((x, y, z) => {
                    this.#updateFieldElement(this.arrowList[idx++], x, y, z, center);
                }, this.size, this.grid);
                break;
        }

        this.simulation.drawParticles();
        this.maxVelocity = 0.0;
    }

    cleanup() {
        log('cleanup');
        this.arrowList = [];
        this.enabled = false;
    }

    checkGridSize(width) {
        log('checkGridSize');
        log('width = ' + width);
        let ret = this.calcGridSize(width);
        let probeCount = ret.grid[0] * ret.grid[1] * ret.grid[2];
        log("probeCount = " + probeCount);
        let total = this.particleList.length - this.arrowList.length + probeCount;
        log("total = " + total);
        if (total > this.graphics.maxParticles) {
            return false;
        }
        return true;
    }

    #populateField(center = new Vector3(), mode = 'cube') {
        log("#populateField");

        if (!this.checkGridSize(this.grid[0])) {
            let probeCount = this.grid[0] * this.grid[1] * this.grid[2];
            log("error: field is to big " + probeCount);
            alert('Field is too big! ' + probeCount);
            return false;
        }        

        this.firstProbeIdx = this.particleList.length - 1;
        this.populateMode = mode;

        switch (this.populateMode) {
            case 'sphere':
                sphereGenerator((x, y, z) => {
                    this.#createFieldElement(new Vector3(x, y, z).add(center));
                }, this.size, this.grid);
                break;

            case 'cube':
            default:
                cubeGenerator((x, y, z) => {
                    this.#createFieldElement(new Vector3(x, y, z).add(center));
                }, this.size, this.grid);
                break;
        }

        return true;
    }

    elementSize() {
        let spacing = this.size / this.grid[0];
        let radius = spacing / 2;
        if (this.grid[2] > 1) {
            radius /= 2;
        }
        radius *= arrowPadding;
        return radius;
    }

    #createFieldElement(position) {
        let p = new Particle();
        p.type = ParticleType.probe;

        this.#updateFieldElement(p, position.x, position.y, position.z);
        p.radius = this.elementSize();

        this.particleList.push(p);
        this.arrowList.push(p);
    }

    #updateFieldElement(particle, x, y, z, center = new Vector3()) {
        particle.mass = this.probeParam.m;
        particle.charge = this.probeParam.q;
        particle.nuclearCharge = this.probeParam.nq;
        particle.radius = this.elementSize();

        particle.position.set(x, y, z)
            .add(center)
            //.sub(new Vector3(0, 0, 2 * this.simulation.particleRadius))
            .sub(new Vector3(0, 0, 1))
            ;        
    }

    refreshMaxVelocity() {
        if (this.enabled == false) return;

        //this.maxVelocity = 0.0;

        let max = this.maxVelocity;
        let sum = new Vector3();
        this.arrowList.forEach(p => {
            sum.add(p.velocity);
            let len = p.velocity.length();
            if (len > max) {
                max = len
                //log("max = " + max.toExponential());
            }
        })
        this.maxVelocity = max;
        let avg = sum.length()/this.arrowList.length;

        this.avgList.push(avg);
        if (this.avgList.length > 10) this.avgList.shift();
        let valSum = 0.0;
        this.avgList.forEach(val => {
            valSum += val;
        })
        let avgFIR = valSum/this.avgList.length;
        this.avgVelocity = avgFIR;

        let variance = 0.0;
        this.avgList.forEach(val => {
            variance += Math.pow(val - avg, 2);
        })
        variance /= this.avgList.length;

        this.varList.push(variance);
        if (this.varList.length > 10) this.varList.shift();
        let varSum = 0.0;
        this.varList.forEach(val => {
            varSum += val;
        })
        let varFIR = varSum/this.avgList.length;
        
        //log('this.maxVelocity ' + this.maxVelocity);
        //log('this.avgVelocity ' + this.avgVelocity);
        log('variance ' + varFIR);

        this.graphics.updateFieldUniform(this.maxVelocity, this.avgVelocity);
    }
}