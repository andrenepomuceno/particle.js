import { Vector3, ArrowHelper, RingGeometry, BoxGeometry, WireframeGeometry, LineSegments } from 'three';
import { simulation } from "../core.js";
import { mouseToScreenCoord, mouseToWorldCoord, floatArrayToString } from '../helpers.js';

const arrowWidth = 1e3;
const arrowHeadLen = 0.05;

export class Ruler {
    constructor(graphics, guiOptions) {
        this.graphics = graphics;
        this.guiOptions = guiOptions;
        this.arrow = undefined;
        this.started = false;
        this.p0 = undefined;
        this.p1 = undefined;
        this.ruler = undefined;
        this.mode = 'box';
    }

    start(graphics, event) {
        this.graphics = graphics;

        this.p0 = mouseToWorldCoord(mouseToScreenCoord(event), this.graphics.camera, 0);

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
                        new RingGeometry(arrowWidth/2 - arrowWidth * arrowHeadLen, arrowWidth/2, 32)
                    ),
                );
                break;

            case 'arrow':
                this.selection = undefined;
                break;
        }

        if (this.selection) this.graphics.scene.add(this.selection);

        this.started = true;

        this.update(event);
    }

    update(event) {
        if (!this.started) return;

        this.p1 = mouseToWorldCoord(mouseToScreenCoord(event), this.graphics.camera, 0);
        this.refreshRulerControls();

        let diff = this.p1.clone().sub(this.p0);
        let dir = diff.clone().normalize();
        let len = diff.length();

        this.arrow.setDirection(dir);
        this.arrow.setLength(len);

        let center = diff.clone().multiplyScalar(0.5).add(this.p0);

        if (this.selection) {
            this.selection.position.set(center.x, center.y, center.z);
        }

        switch (this.mode) {
            case 'box':
            default:
                this.selection.scale.x = diff.x / arrowWidth;
                this.selection.scale.y = diff.y / arrowWidth;
                break;

            case 'circle':
                {
                    let max = Math.max(Math.abs(diff.x), Math.abs(diff.y));
                    this.selection.scale.x = max / arrowWidth;
                    this.selection.scale.y = max / arrowWidth;
                }
                break;
            
            case 'arrow':
                break;
        }
    }

    finish(event) {
        if (!this.started) {
            return;
        }

        this.p1 = mouseToWorldCoord(mouseToScreenCoord(event), this.graphics.camera, 0);
        this.refreshRulerControls();
        
        this.graphics.scene.remove(this.arrow);
        this.arrow.dispose();
        this.arrow = undefined;

        if (this.selection) {
            this.graphics.scene.remove(this.selection);
            this.selection = undefined;
        }

        this.started = false;
    }

    refreshRulerControls() {
        this.ruler = this.p1.clone().sub(this.p0);
        this.guiOptions.info.rulerLen = this.ruler.length().toExponential(8);        
        this.guiOptions.info.rulerDelta = floatArrayToString(this.ruler.toArray(), 3);
        this.guiOptions.info.rulerStart = floatArrayToString(this.p0.toArray(), 3);
    }
}