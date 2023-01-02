import { mouseToWorldCoord, mouseToScreenCoord } from "../helpers";
import { Mesh, MeshBasicMaterial, RingGeometry, Vector2 } from 'three';

function log(msg) {
    console.log("Mouse: " + msg);
}

export class Mouse {
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

    addOverListener(domElement) {
        domElement.addEventListener('mouseover', () => {
            this.overGUI = true;
        });
        domElement.addEventListener('mouseleave', () => {
            this.overGUI = false;
        });
    }

    avgVelocity() {
        let sum = new Vector2();
        this.samples.forEach((val) => {
            sum.add(val);
        });
        sum.divideScalar(this.taps);
        return sum;
    }

    showCursor(graphics, radius = 100, thickness = 10) {
        log(['showCursor',radius,thickness].join(' '));

        this.hideCursor();

        this.graphics = graphics;
        this.cursorMesh = new Mesh(
            new RingGeometry(radius - thickness/2, radius + thickness/2, 32),
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

        let center = mouseToWorldCoord(this.position, this.graphics.camera, 0);
        this.cursorMesh.position.set(center.x, center.y, center.z);
    }
}