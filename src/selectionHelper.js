import { Vector3 } from "three";
import { arrayToString, cameraToWorldCoord, mouseToScreenCoord } from "./helpers";
import { ParticleType } from "./physics";

function log(msg) {
    console.log("SelectionHelper: " + msg);
}

export class SelectionHelper {
    constructor(graphics, options, guiSelection) {
        log("constructor");
        this.graphics = graphics;
        this.options = options;
        this.guiSelection = guiSelection;
        this.started = false;
        this.p0 = undefined;
        this.p1 = undefined;
        this.mouse0 = undefined;
        this.mouse1 = undefined;
        this.list = [];
        this.element = document.createElement('div');
        this.element.classList.add('selectBox');
        this.element.style.pointerEvents = 'none';
        this.startPoint = {};
        this.source = "";
        this.importedData = {};
    }

    start(event) {
        log("start");
        this.started = true;
        this.graphics.controls.enabled = false;
        this.mouse0 = {
            x: event.clientX,
            y: event.clientY
        };
        this.p0 = cameraToWorldCoord(mouseToScreenCoord(event), this.graphics.camera, 0);
        this.list = [];

        this.startPoint.x = event.clientX;
        this.startPoint.y = event.clientY;

        this.graphics.renderer.domElement.parentElement.appendChild(this.element);
        this.element.style.left = event.clientX + 'px';
        this.element.style.top = event.clientY + 'px';
        this.element.style.width = '0px';
        this.element.style.height = '0px';
    }

    update(event) {
        let pointBottomRight = {};
        let pointTopLeft = {};

        pointBottomRight.x = Math.max(this.startPoint.x, event.clientX);
        pointBottomRight.y = Math.max(this.startPoint.y, event.clientY);
        pointTopLeft.x = Math.min(this.startPoint.x, event.clientX);
        pointTopLeft.y = Math.min(this.startPoint.y, event.clientY);

        this.element.style.left = pointTopLeft.x + 'px';
        this.element.style.top = pointTopLeft.y + 'px';
        this.element.style.width = pointBottomRight.x - pointTopLeft.x + 'px';
        this.element.style.height = pointBottomRight.y - pointTopLeft.y + 'px';
    }

    end(event) {
        log("end");
        this.started = false;
        this.graphics.controls.enabled = true;
        this.mouse1 = {
            x: event.clientX,
            y: event.clientY
        };
        this.p1 = cameraToWorldCoord(mouseToScreenCoord(event), this.graphics.camera, 0);

        [this.mouse0, this.mouse1] = this.#topBottom(this.mouse0, this.mouse1);

        this.element.parentElement.removeChild(this.element);

        this.#readParticleData();
        this.source = "simulation";
        this.updateView();
    }

    clear() {
        log("clear");
        this.list = [];
        this.importedData = {};
        let view = this.options;
        if (view != undefined) {
            view.particles = 0;
            view.mass = "";
            view.charge = "";
            view.nearCharge = "";
            view.velocity = "";
            view.velocityDir = "";
            view.center = "";
            view.source = "";
        }
    }

    clone() {
        log("clone");
        if (this.list.length == 0) return;
        this.list.forEach((val, idx) => {
            this.list[idx] = val.clone();
        });
        this.source = "clone";
    }

    #topBottom(p0, p1) {
        let topLeft = {}
        let bottomRight = {};
        bottomRight.x = Math.max(p0.x, p1.x);
        bottomRight.y = Math.min(p0.y, p1.y);
        topLeft.x = Math.min(p0.x, p1.x);
        topLeft.y = Math.max(p0.y, p1.y);
        return [topLeft, bottomRight];
    }

    #readParticleData() {
        log("pushList");

        this.graphics.readbackParticleData();

        let [top, bottom] = this.#topBottom(this.p0, this.p1);

        this.graphics.particleList.forEach(p => {
            if (p.type != ParticleType.default) return;
            let pos = p.position;
            if (
                pos.x >= top.x &&
                pos.x <= bottom.x &&
                pos.y >= bottom.y &&
                pos.y <= top.y
            ) {
                this.list.push(p);
            }
        });
    }

    #updateStats() {
        //log("updateStats");

        this.totalMass = 0;
        this.totalCharge = 0;
        this.totalPos = new Vector3();
        this.totalVelocity = new Vector3();
        this.totalNearCharge = 0;

        this.list.forEach(p => {
            if (p.type != ParticleType.default) return;
            this.totalPos.add(p.position);
            this.totalMass += p.mass;
            this.totalCharge += p.charge;
            this.totalVelocity.add(p.velocity);
            this.totalNearCharge += p.nearCharge;
        });
    }

    updateView() {
        //log("updateView");

        this.#updateStats();

        let particles = this.list.length;
        if (particles > 0) {
            let view = this.options;
            view.source = this.source;
            view.particles = particles;
            view.mass = this.totalMass.toExponential(2);
            view.charge = this.totalCharge.toExponential(2);
            view.nearCharge = this.totalNearCharge.toExponential(2);
            this.totalVelocity.divideScalar(particles);
            view.velocity = this.totalVelocity.length().toExponential(2);
            view.velocityDir = arrayToString(this.totalVelocity.normalize().toArray(), 2);
            this.totalPos.divideScalar(particles);
            let center = this.totalPos.toArray();
            center.forEach((v, i) => {
                center[i] = v.toExponential(2);
            })
            view.center = center;

            this.guiSelection.open();
        } else {
            //this.clear();
        }
    }
}