import { Vector3 } from 'three';
import { ParticleType } from './particle';

export const NuclearPotentialType = {
    default: 'default',
    hooksLaw: 'hooks',
    potential_powXR: 'potential0',
    potential_exp: 'potential1',
    potential_powAX: 'potential2',
    potential_powAXv2: 'potential3',
    potential_powAXv3: 'potential4',
}

export const scaleEPN = {
    m: 1 * 1e18,  // attometer
    kg: 1.0 * (1 / 9.1093837015) * 1e30,  // kilogram, quantum mass
    s: 1e27,  // second, quantum time
    c: 100.0 * (1 / 1.602176634) * 1e18,  // attocoulomb
}
export const nuclearForceRange = 1e-15 * scaleEPN.m;

function log(msg) {
    console.log("Physics: " + msg);
}

export class Physics {
    constructor() {
        log('constructor');

        this.enableColision = true;
        this.enableBoundary = true;
        this.minDistance2 = Math.pow(0.5, 2);
        this.boundaryDistance = 1e12;
        this.boundaryDamping = 0.99;//1.0;

        this.forceConstant = 1.0;
        this.massConstant = 1.0;
        this.chargeConstant = 1.0;
        this.nuclearForceConstant = 1.0;
        this.nuclearForceRange = 1e3;

        this.collisionCounter = 0;

        this.particleList = [];

        this.nuclearPotential = NuclearPotentialType.default;
        this.useBoxBoundary = false;
        this.useDistance1 = false;
        this.velocityShader = undefined;

        this.avgVelocity = 0.0;
        this.avgEnergy = 0.0;
        this.timeDelta = 0.5;
    }

    header() {
        return "enableColision,minDistance2,forceConstant,massConstant,chargeConstant,nuclearForceConstant,nuclearForceRange,boundaryDistance,boundaryDamping";
    }

    csv() {
        return this.enableColision + ","
            + this.minDistance2 + ","
            + this.forceConstant + ","
            + this.massConstant + ","
            + this.chargeConstant + ","
            + this.nuclearForceConstant + ","
            + this.nuclearForceRange + ","
            + this.boundaryDistance + ","
            + this.boundaryDamping;
    }
}

export function calcListStatistics(list) {
    let stats = {};

    stats.center = new Vector3();
    stats.totalVelocity = new Vector3();
    stats.avgVelocity = new Vector3();
    stats.avgEnergy = 0.0;
    stats.totalMass = 0;
    stats.totalCharge = 0;
    stats.totalNuclearCharge = 0;
    stats.particles = list.length;
    stats.fixed = 0;
    stats.totalEnergy = 0.0;
    stats.collisions = 0.0;

    list.forEach(p => {
        switch (p.type) {
            case ParticleType.fixed:
                if (p.type == ParticleType.fixed) stats.fixed++;
                //break;

            case ParticleType.default:
            case ParticleType.fixed:
                stats.center.add(p.position);
                stats.totalVelocity.add(p.velocity);
                stats.totalMass += p.mass;
                stats.totalCharge += p.charge;
                stats.totalNuclearCharge += p.nuclearCharge;
                stats.totalEnergy += p.energy();
                stats.collisions += p.collisions;
                break;

            case ParticleType.undefined:
            default:
                return;
        }    
    });

    stats.center.divideScalar(list.length);
    stats.avgVelocity.add(stats.totalVelocity).divideScalar(list.length);
    stats.avgEnergy = stats.totalEnergy/list.length;

    return stats;
}