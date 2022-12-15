import { cameraToWorldCoord, mouseToScreenCoord } from "./helpers";
import { Mesh, MeshBasicMaterial, RingGeometry, Vector2 } from "three";

export class MouseHelper {
    constructor() {
        this.position = new Vector2();
        this.velocity = new Vector2();
        this.lastMove = Date.now();
        this.overGUI = false;
        this.samples = [];
        this.taps = 10;

        this.cursorMesh = undefined;
        this.graphics = undefined;
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

        this.updateCursor();
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
        return sum / this.taps;
    }

    showCursor(graphics, radius = 100, thickness = 10) {
        this.hideCursor();

        this.graphics = graphics;
        this.cursorMesh = new Mesh(
            new RingGeometry(radius - thickness, radius + thickness, 64),
            new MeshBasicMaterial({ color: 0xfffffff })
        );
        graphics.scene.add(this.cursorMesh);
    }

    hideCursor() {
        if (this.cursorMesh != undefined) {
            this.graphics.scene.remove(this.cursorMesh);
            this.cursorMesh = undefined;
        }
    }

    updateCursor() {
        if (this.cursorMesh == undefined) return;

        let center = cameraToWorldCoord(this.position, this.graphics.camera, 0);
        this.cursorMesh.position.set(center.x, center.y, 0);
    }
}