import { Vector3, Color } from 'three';

let particleId = 0;

function log(msg) {
    console.log("Physics: " + msg);
}
export class Physics {
    constructor() {
        log("constructor");

        this.enableColision = true;
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

        this.nuclearPotential = "default";
        this.useBoxBoundary = false;
        this.useDistance1 = false;
        this.velocityShader = undefined;
    }

    interact(p1, p2, probe = false) {
        if (p1.id == p2.id) return;

        let distance = p2.position.clone();
        distance.sub(p1.position);

        let absDistance2 = distance.lengthSq();
        if (absDistance2 <= this.minDistance2) {
            if (!probe) {
                this.colide(p1, p2);
                return;
            }
            absDistance2 = this.minDistance2; // for probe
        }

        let force = 0.0;

        force += this.massConstant * p1.mass * p2.mass;
        force += -this.chargeConstant * p1.charge * p2.charge;
        force /= absDistance2;

        let absDistance = Math.sqrt(absDistance2);
        if (absDistance <= this.nuclearChargeRange) {
            let x = (2 * absDistance - this.nuclearChargeRange) / this.nuclearChargeRange; // [-1, 1]
            x = Math.sin(Math.PI * x);
            let f = -this.nuclearChargeConstant * p1.nuclearCharge * p2.nuclearCharge * x;
            force += f;
        }

        force *= this.forceConstant;

        distance.normalize();
        distance.multiplyScalar(force);

        p1.force.add(distance);
        p2.force.sub(distance);
    }

    colide(p1, p2) {
        if (!this.enableColision) return;

        ++this.collisionCounter;

        let m = p1.mass + p2.mass;
        if (m == 0) {
            return;
        }

        let s = 2 * p1.mass * p2.mass / m;
        let dv = p2.velocity.clone().sub(p1.velocity);
        let dp = p2.position.clone().sub(p1.position);
        let dp2 = dp.lengthSq();
        if (dp2 > 0) {
            dp.multiplyScalar(s * dv.dot(dp) / dp2);
            p1.force.add(dp);
            p2.force.sub(dp);
        } else {
            dv.multiplyScalar(s);
            p1.force.add(dv);
            p2.force.sub(dv);
        }
    }

    update(p) {
        if (p.type == ParticleType.fixed) {
            return;
        }

        let accel;
        if (p.mass != 0.0) {
            accel = p.force.divideScalar(Math.abs(p.mass));
        } else {
            accel = p.force;
        }

        p.velocity.add(accel);
        p.position.add(p.velocity);

        p.force.setScalar(0);
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

export const ParticleType = {
    undefined: -1.0,
    default: 0.0,
    probe: 1.0,
    fixed: 2.0,
}

export class Particle {
    constructor() {
        this.id = particleId++;
        this.type = ParticleType.default;

        this.mass = 0.0;
        this.charge = 0.0;
        this.nuclearCharge = 0.0;

        this.position = new Vector3();
        this.velocity = new Vector3();

        this.force = new Vector3();
        this.mesh = undefined;
        this.color = undefined;
        this.radius = undefined;
        this.uv = [];
        this.collisions = 0.0;
    }

    clone() {
        let p = new Particle();
        p.type = this.type;
        p.mass = this.mass;
        p.charge = this.charge;
        p.nuclearCharge = this.nuclearCharge;
        p.position = this.position.clone();
        p.velocity = this.velocity.clone();
        return p;
    }

    energy() {
        return this.mass * this.velocity.lengthSq();
    }

    setColor(color = 0xffffff) {
        if (this.mesh) this.mesh.material.color.set(color);
        this.color = new Color(color);
    }

    print() {
        console.log(
            "ID:" + this.id +
            " M:" + this.mass +
            " Q:" + this.charge +
            " Sq:" + this.nuclearCharge +
            " P:" + this.position.toArray() +
            " V:" + this.velocity.toArray() +
            " E:" + this.energy()
        );
    }

    header() {
        return "id,type,mass,charge,nuclearCharge,x,y,z,vx,vy,vz,e,collisions";
    }

    csv() {
        return this.id + "," +
            this.type + "," +
            this.mass + "," +
            this.charge + "," +
            this.nuclearCharge + "," +
            this.position.toArray() + "," +
            this.velocity.toArray() + "," +
            this.energy() + "," +
            this.collisions;
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

    list.forEach(p => {
        if (p.type != ParticleType.default) return;
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