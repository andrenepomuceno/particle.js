import { Vector3 } from 'three';

let particleId = 0;

export class Physics {
    constructor() {
        particleId = 0;

        this.enableColision = true;
        this.minDistance = 0.25;

        this.forceConstant = 1;
        this.massConstant = 1;
        this.chargeConstant = 1;
        this.nearChargeConstant = 1;
        this.nearChargeRange = 1e3;

        this.colisionCounter = 0;
    }

    interact(p1, p2, probe = false) {
        if (p1.id == p2.id) return;

        let distance = p2.position.clone();
        distance.sub(p1.position);

        let absDistance2 = distance.lengthSq();
        if (absDistance2 <= this.minDistance) {
            if (!probe) {
                this.colide(p1, p2);
                return;
            }
            absDistance2 = this.minDistance; // for probe
        }

        let force = 0.0;

        force += this.massConstant * p1.mass * p2.mass;
        force += -this.chargeConstant * p1.charge * p2.charge;
        force /= absDistance2;

        let absDistance = Math.sqrt(absDistance2);
        if (absDistance <= this.nearChargeRange) {
            let x = (2 * absDistance - this.nearChargeRange) / this.nearChargeRange; // [-1, 1]
            x = Math.sin(Math.PI * x);
            let f = -this.nearChargeConstant * p1.nearCharge * p2.nearCharge * x;
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

        ++this.colisionCounter;

        let m = p1.mass + p2.mass;
        if (m == 0) {
            return;
        }

        let s = 2 * p1.mass * p2.mass / m;
        let dv = p2.velocity.clone().sub(p1.velocity);
        dv.multiplyScalar(s);

        p1.force.add(dv);
        p2.force.sub(dv);
    }

    update(p) {
        if (p.fixed) {
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
        return "enableColision,minDistance,forceConstant,massConstant,chargeConstant,nearChargeConstant,nearChargeRange";
    }

    csv() {
        return this.enableColision + ","
            + this.minDistance + ","
            + this.forceConstant + ","
            + this.massConstant + ","
            + this.chargeConstant + ","
            + this.nearChargeConstant + ","
            + this.nearChargeRange;
    }
}

export class Particle {
    constructor() {
        this.id = particleId++;

        this.mass = 0;
        this.charge = 0;
        this.nearCharge = 0;

        this.position = new Vector3();
        this.velocity = new Vector3();
        this.force = new Vector3();

        this.fixed = false;

        this.mesh = undefined;
    }

    energy() {
        return this.mass * this.velocity.lengthSq();
    }

    setColor(color = 0xffffff) {
        this.mesh.material.color.set(color);
    }

    print() {
        console.log(
            "ID:" + this.id +
            " M:" + this.mass +
            " Q:" + this.charge +
            " Sq:" + this.nearCharge +
            " P:" + this.position.toArray() +
            " V:" + this.velocity.toArray() +
            " E:" + this.energy()
        );
    }

    header() {
        return "id,m,q,nq,x,y,z,vx,vy,vz,e";
    }

    csv() {
        return this.id + "," +
            this.mass + "," +
            this.charge + "," +
            this.nearCharge + "," +
            this.position.toArray() + "," +
            this.velocity.toArray() + "," +
            this.energy();
    }
}