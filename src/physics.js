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
    potential_forceMap1: 'forceMap1',
    potential_forceMap2: 'forceMap2',
}

export const FrictionModel = {
    default: '-cv',
    square: '-cv^2',
}

export const scaleEPN = {
    m: 1 * 1e18,  // attometer
    kg: 1.0 * (1 / 9.1093837015) * 1e30,  // kilogram, quantum mass
    s: 1e27,  // second, quantum time
    c: 100.0 * (1 / 1.602176634) * 1e18,  // attocoulomb
}
export const nuclearForceRange = 1e-15 * scaleEPN.m;

function log(msg) {
    //console.log("Physics: " + msg);
}

export class Physics {
    constructor(input = {
        mode2D: true,
        enableColision: true,
        enableBoundary: true,
        minDistance2: Math.pow(0.5, 2),
        boundaryDistance: 1e12,
        boundaryDamping: 0.99,

        forceConstant: 1.0,
        massConstant: 1.0,
        chargeConstant: 1.0,
        nuclearForceConstant: 1.0,
        nuclearForceRange: 1e3,

        maxVel: 1e12,
        enableLorentzFactor: false,
        fineStructureConstant: 1/137,
        enableFineStructure: false,
        enableColorCharge: false,
        colorChargeConstant: 1/3,

        collisionCounter: 0,

        //particleList: [],

        nuclearPotential: NuclearPotentialType.default,
        useBoxBoundary: false,
        useDistance1: false,
        velocityShader: undefined,
        positionShader: undefined,

        enableFriction: false,
        frictionConstant: 1e-4,
        frictionModel: FrictionModel.square,

        avgVelocity: 0.0,
        avgEnergy: 0.0,

        forceMap: [1.0, -1.0],
    }) {
        log('constructor');

        this.mode2D = input.mode2D;
        this.enableColision = input.enableColision;
        this.enableBoundary = input.enableBoundary;
        this.minDistance2 = input.minDistance2;
        this.boundaryDistance = input.boundaryDistance;
        this.boundaryDamping = input.boundaryDamping;

        this.forceConstant = input.forceConstant;
        this.massConstant = input.massConstant;
        this.chargeConstant = input.chargeConstant;
        this.nuclearForceConstant = input.nuclearForceConstant;
        this.nuclearForceRange = input.nuclearForceRange;

        this.maxVel = input.maxVel;
        this.enableLorentzFactor = input.enableLorentzFactor;
        this.fineStructureConstant = input.fineStructureConstant;
        this.enableFineStructure = input.enableFineStructure;
        this.enableColorCharge = input.enableColorCharge;
        this.colorChargeConstant = input.colorChargeConstant;

        this.collisionCounter = input.collisionCounter;

        //this.particleList = input.particleList;
        this.particleList = [];

        this.nuclearPotential = input.nuclearPotential;
        this.useBoxBoundary = input.useBoxBoundary;
        this.useDistance1 = input.useDistance1;
        this.velocityShader = input.velocityShader;
        this.positionShader = input.positionShader;

        this.enableFriction = input.enableFriction;
        this.frictionConstant = input.frictionConstant;
        this.frictionModel = input.frictionModel;

        this.avgVelocity = input.avgVelocity;
        this.avgEnergy = input.avgEnergy;

        this.forceMap = input.forceMap;
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

    stats.mMin = Infinity;
    stats.mMax = -Infinity;
    stats.qMin = Infinity;
    stats.qMax = -Infinity;

    list.forEach(p => {
        switch (p.type) {
            case ParticleType.fixed:
                if (p.type == ParticleType.fixed) stats.fixed++;
                //break;

            case ParticleType.default:
                stats.center.add(p.position);
                stats.totalVelocity.add(p.velocity);
                stats.totalMass += p.mass;
                stats.totalCharge += p.charge;
                stats.totalNuclearCharge += p.nuclearCharge;
                stats.totalEnergy += p.energy();
                stats.collisions += p.collisions;

                if (p.mass > stats.mMax) {
                    stats.mMax = p.mass;
                }
                if (p.mass < stats.mMin) {
                    stats.mMin = p.mass;
                }
                if (p.charge > stats.qMax) {
                    stats.qMax = p.charge;
                }
                if (p.charge < stats.qMin) {
                    stats.qMin = p.charge;
                }
                break;

            case ParticleType.undefined:
            case ParticleType.probe:
            default:
                return;
        }    
    });

    let n = list.length;
    if (n == 0) n = 1;
    stats.center.divideScalar(n);
    stats.avgVelocity.add(stats.totalVelocity).divideScalar(n);
    stats.avgEnergy = stats.totalEnergy/n;

    return stats;
}