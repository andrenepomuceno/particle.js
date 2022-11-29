import { mouseToScreenCoord } from "./helpers";
import { Vector2 } from "three";

export class MouseHelper {
    constructor() {
        this.position = new Vector2();
        this.velocity = new Vector2();
        this.lastMove = Date.now();
        this.overGUI = false;
        this.samples = [];
        this.taps = 10;
    }

    move(event) {
        let pos = mouseToScreenCoord(event);

        let now = Date.now();
        let dt = now - this.lastMove;
        this.lastMove = now;
        this.velocity.set(pos.x - this.position.x, pos.y - this.position.y).divideScalar(dt / 1e3);

        this.samples.push(this.velocity);
        if (this.samples.length > this.taps) this.samples.shift();

        this.position.set(pos.x, pos.y);
    }

    addListener(domElement) {
        domElement.addEventListener("mouseover", () => {
            this.overGUI = true;
        });
        domElement.addEventListener("mouseleave", () => {
            this.overGUI = false;
        });
    }

    avgVelocity() {
        let sum = 0;
        this.samples.forEach((val) => {
            sum += val.length();
        });
        return sum/this.taps;
    }
}