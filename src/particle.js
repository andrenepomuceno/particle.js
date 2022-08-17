import { Vector3 } from 'three';

let particleId = 0;

export class Particle {
    constructor() {
        this.id = particleId++;
        this.position = new Vector3();
        this.velocity = new Vector3();
        this.acceleration = new Vector3();
        this.mass = 0;
        this.charge = 0;
        this.force = new Vector3();
        
        this.fixed = false;
    }

    update(physics) {
        if (this.fixed) {
            return;
        }

        if (this.mass != 0.0) {
            this.force.divideScalar(Math.abs(this.mass));
        }

        this.velocity.add(this.force);
        this.position.add(this.velocity);

        if (physics.quantizedPosition) {
            this.position.round();
        }

        this.force.setScalar(0);
    }

    print() {
        console.log("ID:" + this.id + " M:" + this.mass + " Q:" + this.charge + " P:" + this.position.toArray() + " V:" + this.velocity.toArray());
    }

    csv() {
        return this.id + "," + this.mass + "," + this.charge + "," + this.position.toArray() + "," + this.velocity.toArray();
    }
}