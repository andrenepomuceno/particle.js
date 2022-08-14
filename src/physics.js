
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
    }

    colide(p1, p2) {
        let m = p1.mass + p2.mass;
        if (m == 0) {
            return;
        }
    
        let s = 2 * p1.mass * p2.mass / m;
        let dv1 = p2.velocity.clone().sub(p1.velocity);
        let dv2 = p1.velocity.clone().sub(p2.velocity);
    
        dv1.multiplyScalar(s);
        dv2.multiplyScalar(s);
    
        p1.force.add(dv1);
        p2.force.add(dv2);
    }
    
    interact(p1, p2) {
        if (p1.id == p2.id) return;
    
        let distance = p2.position.clone();
        distance.sub(p1.position);
    
        let absDistanceSq = distance.lengthSq();
        if (this.minDistance > 0 && absDistanceSq < this.minDistance) {
            absDistanceSq = this.minDistance;
            return;
        }
    
        if (absDistanceSq == 0.0) {
            return;
        }
    
        let force = 0.0;
        force += this.massConstant * p1.mass * p2.mass;
        force -= this.chargeConstant * p1.charge * p2.charge;
        force /= absDistanceSq;
        if (force == 0.0) return;
    
        distance.multiplyScalar(force);
        p1.force.add(distance);
    
        p2.force.sub(distance);
    }
}
