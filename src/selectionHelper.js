import { arrayToString, cameraToWorldCoord, downloadFile, exportFilename, mouseToScreenCoord } from "./helpers";
import { calcListStatistics } from "./physics";
import { ParticleType } from "./particle";
const { Image } = require('image-js');
import { simulationExportCsv } from "./core";

function log(msg) {
    console.log("SelectionHelper: " + msg);
}

export const SourceType = {
    none: "None",
    selection: "Selection",
    simulation: "Simulation",
    imported: "Imported",
    generated: "Generated",
    clone: "Clone",
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
        this.source = SourceType.none;
        this.importedData = {};
        this.blob = undefined;
        this.stats = {};
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

        this.mouse1 = {
            x: event.clientX,
            y: event.clientY
        };
        this.p1 = cameraToWorldCoord(mouseToScreenCoord(event), this.graphics.camera, 0);
        this.ruler = this.p1.clone().sub(this.p0);
        [this.mouse0, this.mouse1] = this.#topBottom(this.mouse0, this.mouse1);

        if (this.#readParticleData() > 0) {
            this.#snapshot();
            this.source = SourceType.simulation;
            this.guiRefresh();
            this.guiSelection.open();
            this.guiSelection.guiSelectionProperties.open();
        } else {
            this.clear();
            this.guiSelection.close();
        }

        this.element.parentElement.removeChild(this.element);

        this.graphics.controls.enabled = true;
        this.started = false;
    }

    #snapshot() {
        log("#snapshot");
        this.graphics.update();
        this.graphics.renderer.domElement.toBlob((blob) => {
            blob.arrayBuffer().then((dataBuffer) => {
                Image.load(dataBuffer).then((image) => {
                    let topLeft = this.mouse0;
                    let bottomRight = this.mouse1;
                    let width = bottomRight.x - topLeft.x;
                    let height = topLeft.y - bottomRight.y;
                    image.crop({
                        x: topLeft.x,
                        y: bottomRight.y,
                        width,
                        height,
                    }).toBlob().then((croped) => {
                        this.blob = croped;
                    });
                });
            });
        }, 'image/png', 1);
    }

    export() {
        log("export");
        if (this.list == undefined || this.list.length == 0) {
            alert("Please select particles first!");
            return;
        }
        let finalName = exportFilename("selection_" + this.source);
        if (this.blob != undefined) downloadFile(this.blob, finalName + ".png", "image/png");
        downloadFile(simulationExportCsv(this.list), finalName + ".csv", "text/plain;charset=utf-8");
    }

    import(imported) {
        this.importedData = imported;
        this.list = imported.physics.particleList;
        this.source = SourceType.imported + " from " + filename;
        this.guiRefresh();
    }

    clear() {
        log("clear");
        this.list = [];
        this.importedData = {};
        this.blob = undefined;
        this.stats = {};
        let view = this.options;
        if (view != undefined) {
            view.particles = 0;
            view.mass = "";
            view.charge = "";
            view.nuclearCharge = "";
            view.velocity = "";
            view.velocityDir = "";
            view.center = "";
            view.source = SourceType.none;
        }
    }

    clone() {
        log("clone");
        if (this.list.length == 0) return;
        this.list.forEach((val, idx) => {
            this.list[idx] = val.clone();
        });
        this.source = SourceType.clone;
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
        log("#readParticleData");

        this.list = [];

        this.graphics.readbackParticleData();

        let [top, bottom] = this.#topBottom(this.p0, this.p1);

        this.graphics.particleList.forEach(p => {
            if (p.type != ParticleType.default && p.type != ParticleType.fixed) return;
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

        return this.list.length;
    }

    guiRefresh() {
        //log("updateView");
        let particles = this.list.length;
        if (particles > 0) {
            this.stats = calcListStatistics(this.list);
            let view = this.options;
            view.source = this.source;
            view.particles = particles;
            view.mass = this.stats.totalMass.toExponential(2);
            view.charge = this.stats.totalCharge.toExponential(2);
            view.nuclearCharge = this.stats.totalNuclearCharge.toExponential(2);
            view.velocity = this.stats.avgVelocity.length().toExponential(2);
            view.velocityDir = arrayToString(this.stats.avgVelocity.clone().normalize().toArray(), 2);
            let center = this.stats.center.toArray();
            center.forEach((v, i) => {
                center[i] = v.toExponential(2);
            })
            view.center = center;
            view.fixedPosition = (this.stats.fixed > 0);
        }
    }
}