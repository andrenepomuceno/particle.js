import { Vector3 } from 'three';

let particleId = 0;

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
    }

    print() {
        console.log("ID:" + this.id + " M:" + this.mass + " Q:" + this.charge + " Sq:" + this.nearCharge + " P:" + this.position.toArray() + " V:" + this.velocity.toArray());
    }

    csv() {
        return this.id + "," + this.mass + "," + this.charge + "," + this.nearCharge + "," + this.position.toArray() + "," + this.velocity.toArray();
    }
}

export class Physics {
    constructor() {
        particleId = 0;

        this.enableColision = true;

        this.forceConstant = 1;
        this.massConstant = 1;
        this.chargeConstant = 1;
        this.nearChargeConstant = 1;
        this.nearChargeRange = 128;

        this.colisionCounter = 0;
    }

    interact(p1, p2, probe = false) {
        if (p1.id == p2.id) return;

        let distance = p2.position.clone();
        distance.sub(p1.position);

        let absDistance2 = distance.lengthSq();
        if (absDistance2 == 0.0) {
            if (!probe) this.colide(p1, p2);
            return;
        }

        let force = 0.0;
        force += this.massConstant * p1.mass * p2.mass;
        force -= this.chargeConstant * p1.charge * p2.charge;
        force /= absDistance2;

        let absDistance = Math.sqrt(absDistance2);
        if (absDistance < this.nearChargeRange) {
            let x = (2 * absDistance - this.nearChargeRange);
            x /= this.nearChargeRange;
            let f = -p1.nearCharge * p2.nearCharge;
            f *= x;
            f *= this.nearChargeConstant;
            force += f;
        }

        force *= this.forceConstant;

        distance.normalize();
        distance.multiplyScalar(force);

        p1.force.add(distance);
        p2.force.sub(distance);
    }

    colide(p1, p2) {
        ++this.colisionCounter;

        if (!this.enableColision) return;

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

        if (p.mass != 0.0) {
            p.force.divideScalar(Math.abs(p.mass));
        }

        p.velocity.add(p.force);
        p.position.add(p.velocity);

        p.force.setScalar(0);
    }
}
