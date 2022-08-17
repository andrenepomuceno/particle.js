
export class Physics {
    constructor() {
        this.quantizedPosition = false;
        this.forceConstant = 1;
        this.minDistance = 0;
        this.enableColision = true;

        this.massConstant = 1;
        this.chargeConstant = 1;
        this.chargeRange = [-1, 1];
        this.massRange = [1, 1];

        this.colisions = 0;
    }

    colide(p1, p2) {
        ++this.colisions;

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
    
    interact(p1, p2) {
        if (p1.id == p2.id) return;
    
        let distance = p2.position.clone();
        distance.sub(p1.position);
    
        let absDistanceSq = distance.lengthSq();
        if (this.minDistance > 0 && absDistanceSq < this.minDistance) {
            absDistanceSq = this.minDistance;
        }
    
        if (absDistanceSq == 0.0) {
            return;
        }
    
        let force = 0.0;
        force += this.massConstant * p1.mass * p2.mass;
        force -= this.chargeConstant * p1.charge * p2.charge;
        if (force == 0.0) return;
        force /= absDistanceSq;
        force *= this.forceConstant;
        
        distance.normalize();
        distance.multiplyScalar(force);
        p1.force.add(distance);
        p2.force.sub(distance);
    }
}
