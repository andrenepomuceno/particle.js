import { Vector3 } from 'three';

export const NuclearPotentialType = {
    default: "default",
    hooksLaw: "hooks",
    potential_powXR: "potential0",
    potential_exp: "potential1",
    potential_powAX: "potential2",
}

function log(msg) {
    console.log("Physics: " + msg);
}

export class Physics {
    constructor() {
        log("constructor");

        this.enableColision = true;
        this.enableBoundary = true;
        this.minDistance2 = Math.pow(0.5, 2);
        this.boundaryDistance = 1e12;
        this.boundaryDamping = 0.99;//1.0;

        this.forceConstant = 1.0;
        this.massConstant = 1.0;
        this.chargeConstant = 1.0;
        this.nuclearChargeConstant = 1.0;
        this.nuclearChargeRange = 1e3;

        this.collisionCounter = 0;

        this.particleList = [];

        this.nuclearPotential = NuclearPotentialType.default;
        this.useBoxBoundary = false;
        this.useDistance1 = false;
        this.velocityShader = undefined;
    }

    header() {
        return "enableColision,minDistance2,forceConstant,massConstant,chargeConstant,nuclearChargeConstant,nuclearChargeRange,boundaryDistance,boundaryDamping";
    }

    csv() {
        return this.enableColision + ","
            + this.minDistance2 + ","
            + this.forceConstant + ","
            + this.massConstant + ","
            + this.chargeConstant + ","
            + this.nuclearChargeConstant + ","
            + this.nuclearChargeRange + ","
            + this.boundaryDistance + ","
            + this.boundaryDamping;
    }
}

export function calcListStatistics(list) {
    let stats = {};

    stats.center = new Vector3();
    stats.avgVelocity = new Vector3();
    stats.totalMass = 0;
    stats.totalCharge = 0;
    stats.totalNuclearCharge = 0;
    stats.particles = list.length;
    stats.fixed = 0;

    list.forEach(p => {
        if (p.type == ParticleType.fixed) stats.fixed++;
        if (p.type != ParticleType.default && p.type != ParticleType.fixed) return;
        stats.center.add(p.position);
        stats.avgVelocity.add(p.velocity);
        stats.totalMass += p.mass;
        stats.totalCharge += p.charge;
        stats.totalNuclearCharge += p.nuclearCharge;
    });

    stats.center.divideScalar(list.length);
    stats.avgVelocity.divideScalar(list.length);

    return stats;
}