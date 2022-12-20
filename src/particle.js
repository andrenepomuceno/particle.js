import { Vector3, Color } from "three";

let particleId = 0;

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
            " TYPE:" + this.type +
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
