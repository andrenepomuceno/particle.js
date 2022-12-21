import { Vector3, ArrowHelper } from "three";
import { mouseToScreenCoord, cameraToWorldCoord } from './helpers.js';

const arrowWidth = 1e3;
const arrowHeadLen = 0.05;

export class Ruler {
    constructor(graphics, controls) {
        this.graphics = graphics;
        this.controls = controls;
        this.arrow = undefined;
        this.started = false;
        this.p0 = undefined;
        this.p1 = undefined;
        this.ruler = undefined;
    }

    start(graphics, event) {
        this.graphics = graphics;

        this.p0 = cameraToWorldCoord(mouseToScreenCoord(event), this.graphics.camera, 0);

        if (this.arrow != undefined) {
            this.graphics.scene.remove(this.arrow);
        }

        this.arrow = new ArrowHelper(new Vector3(1, 0, 0), new Vector3(
            this.p0.x,
            this.p0.y,
            this.p0.z,
        ), arrowWidth, 0xffffff, arrowHeadLen * arrowWidth);
        this.arrow.setLength(1);
        this.graphics.scene.add(this.arrow);

        this.started = true;
    }

    update(event) {
        if (!this.started) return;

        this.p1 = cameraToWorldCoord(mouseToScreenCoord(event), this.graphics.camera, 0);

        let diff = this.p1.clone().sub(this.p0);
        let dir = diff.clone().normalize();
        let len = diff.length();

        this.arrow.setDirection(dir);
        this.arrow.setLength(len);
    }

    finish(event) {
        this.p1 = cameraToWorldCoord(mouseToScreenCoord(event), this.graphics.camera, 0);
        this.ruler = this.p1.clone().sub(this.p0);

        this.graphics.scene.remove(this.arrow);
        this.arrow.dispose();
        this.arrow = undefined;

        this.controls.ruler =
            "d: " + this.ruler.length().toExponential(3) +
            " x: " + this.ruler.x.toExponential(3) +
            " y: " + this.ruler.y.toExponential(3);
    }
}