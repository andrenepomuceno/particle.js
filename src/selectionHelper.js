import { Vector3 } from "three";
import { arrayToString, cameraToWorld, mouseToRelative } from "./helpers";
import { ParticleType } from "./physics";

export class SelectionHelper {
    constructor(graphics, options, guiSelection) {
        this.graphics = graphics;
        this.options = options;
        this.guiSelection = guiSelection;
        this.started = false;
        this.p0 = undefined;
        this.p1 = undefined;
        this.list = [];
        this.element = document.createElement('div');
        this.element.classList.add('selectBox');
        this.element.style.pointerEvents = 'none';
        this.startPoint = {}
    }

    start(event) {
        this.started = true;
        this.graphics.controls.enabled = false;
        this.p0 = cameraToWorld(mouseToRelative(event), this.graphics.camera, 0);
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

    #topBottom(p0, p1) {
        // console.log(p0);
        // console.log(p1);
        let top = {}
        let bottom = {};
        bottom.x = Math.max(p0.x, p1.x);
        bottom.y = Math.min(p0.y, p1.y);
        top.x = Math.min(p0.x, p1.x);
        top.y = Math.max(p0.y, p1.y);
        // console.log(top);
        // console.log(bottom);
        return [top, bottom];
    }

    end(event) {
        this.started = false;
        this.graphics.controls.enabled = true;
        this.p1 = cameraToWorld(mouseToRelative(event), this.graphics.camera, 0);

        this.element.parentElement.removeChild(this.element);

        this.graphics.readbackParticleData();

        let [top, bottom] = this.#topBottom(this.p0, this.p1);

        let totalMass = 0;
        let totalCharge = 0;
        let totalPos = new Vector3();
        let totalVelocity = new Vector3();
        let totalNQ = 0;

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
                totalPos.add(p.position);
                totalMass += p.mass;
                totalCharge += p.charge;
                totalVelocity.add(p.velocity);
                totalNQ += p.nearCharge;
            }
        });

        let particles = this.list.length;

        if (particles > 0) {
            let view = this.options;
            view.particles = particles;
            view.mass = totalMass.toExponential(2);
            view.charge = totalCharge.toExponential(2);
            view.nearCharge = totalNQ.toExponential(2);
            totalVelocity.divideScalar(particles);
            view.velocity = totalVelocity.length().toExponential(2);
            view.velocityDir = arrayToString(totalVelocity.normalize().toArray(), 2);
            totalPos.divideScalar(particles);
            let center = totalPos.toArray();
            center.forEach((v, i) => {
                center[i] = v.toExponential(2);
            })
            view.center = center;

            this.guiSelection.open();
        } else {
            this.clear();
            //this.guiSelection.close();
        }
    }

    clear() {
        let view = this.options;
        view.particles = 0;
        view.mass = "";
        view.charge = "";
        view.nearCharge = "";
        view.velocity = "";
        view.velocityDir = "";
        view.center = "";
    }
}