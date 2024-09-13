import { Vector3, Color } from 'three';

let gParticleId = 0;

export const ParticleType = {
    undefined: -1.0,
    default: 0.0,
    probe: 1.0,
    fixed: 2.0,
}

export class Particle {
    constructor(input = {
        //id: gParticleId++,
        type: ParticleType.default,

        mass: 0.0,
        charge: 0.0,
        nuclearCharge: 0.0,
        colorCharge: 0.0,

        position: {
            x: 0.0, y: 0.0, z: 0.0
        },
        velocity: {
            x: 0.0, y: 0.0, z: 0.0
        },

        color: 0,
        radius: 0,
        name: '',

        collisions: 0,
        outOfBoundary: 0,
    }) {
        //this.id = input.id;
        this.id = gParticleId++;
        this.type = input.type;

        this.mass = input.mass;
        this.charge = input.charge;
        this.nuclearCharge = input.nuclearCharge;
        this.colorCharge = input.colorCharge;

        this.position = new Vector3(input.position.x, input.position.y, input.position.z);
        this.velocity = new Vector3(input.velocity.x, input.velocity.y, input.velocity.z);

        this.color = new Color(input.color);
        this.radius = input.radius;
        this.name = input.name;

        this.collisions = input.collisions;
        this.outOfBoundary = input.outOfBoundary;

        this.force = new Vector3();
        this.uv = [];
    }

    clone() {
        let p = new Particle(this);
        return p;
    }

    energy() {
        return this.mass * this.velocity.lengthSq();
    }

    setColor(color = 0xffffff) {
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
        return "id,type,mass,charge,nuclearCharge,x,y,z,vx,vy,vz,e,collisions,name";
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
            this.collisions + ',' +
            this.name;
    }
}
