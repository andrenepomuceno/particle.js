import { Vector3, ArrowHelper, Mesh, RingGeometry, MeshBasicMaterial, PlaneGeometry, BoxGeometry, WireframeGeometry, LineSegments } from "three";
import { simulation } from "./core.js";
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
        this.mode = 'box';
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

        switch (this.mode) {
            case 'box':
            default:
                this.selection = new LineSegments(
                    new WireframeGeometry(
                        new BoxGeometry(
                            arrowWidth, arrowWidth, simulation.particleRadius
                        )
                    ),
                );
                break;

            case 'circle':
                this.selection = new LineSegments(
                    new WireframeGeometry(
                        new RingGeometry(arrowWidth * (1 - arrowHeadLen) / 2, arrowWidth * (1 + arrowHeadLen) / 2, 32)
                    ),
                );
                break;
        }

        this.graphics.scene.add(this.selection);

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

        let center = diff.clone().multiplyScalar(0.5).add(this.p0);
        this.selection.position.set(center.x, center.y, center.z);
        let max = Math.max(diff.x, diff.y);
        this.selection.scale.x = max / arrowWidth;
        this.selection.scale.y = max / arrowWidth;
    }

    finish(event) {
        this.p1 = cameraToWorldCoord(mouseToScreenCoord(event), this.graphics.camera, 0);
        this.ruler = this.p1.clone().sub(this.p0);

        this.graphics.scene.remove(this.arrow);
        this.arrow.dispose();
        this.arrow = undefined;

        this.graphics.scene.remove(this.selection);
        this.selection = undefined;

        this.controls.ruler =
            "d: " + this.ruler.length().toExponential(3) +
            " x: " + this.ruler.x.toExponential(3) +
            " y: " + this.ruler.y.toExponential(3);

        this.started = false;
    }
}