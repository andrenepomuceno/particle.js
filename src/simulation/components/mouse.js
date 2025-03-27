import { mouseToWorldCoord, mouseToScreenCoord } from "../helpers";
import { Mesh, MeshBasicMaterial, RingGeometry, Vector2 } from 'three';

function log(msg) {
    //console.log("Mouse: " + msg);
}

export class Mouse {
    constructor() {
        this.position = new Vector2();
        this.overGUI = false;
        this.cursorMesh = undefined;
        this.graphics = undefined;
    }

    move(event) {
        let pos = mouseToScreenCoord(event);

        this.position.set(pos.x, pos.y);

        this.updateCursor();

        // check if mouse if over the menu
        var rootDiv = document.getElementById('root');
        if (rootDiv.matches(':hover')) {
            this.overGUI = true;
        } else {
            this.overGUI = false;
        }
    }

    showCursor(graphics, radius = 100, thickness = 10) {
        log(['showCursor', radius, thickness].join(' '));

        this.hideCursor();
        this.graphics = graphics;
        this.cursorMesh = graphics.drawCursor(true, radius, thickness);
    }

    hideCursor() {
        if (this.cursorMesh != undefined) {
            this.graphics.drawCursor(false);
            this.cursorMesh = undefined;
        }
    }

    updateCursor() {
        if (this.cursorMesh == undefined) return;

        let center = mouseToWorldCoord(this.position, this.graphics.camera, 0);
        this.cursorMesh.position.set(center.x, center.y, center.z);
    }
}