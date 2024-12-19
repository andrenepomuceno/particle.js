import { arrayToString, mouseToWorldCoord, downloadFile, generateExportFilename, mouseToScreenCoord, downloadStringToZip } from "../helpers";
import { calcListStatistics } from "../physics";
import { ParticleType } from "../particle";
const { Image } = require('image-js');
import { Vector3 } from 'three';
import { core } from "../core";
import { UI } from "../../ui/App";

function log(msg) {
    //console.log("Selection: " + msg);
}

export const SourceType = {
    none: 'None',
    selection: 'Selection',
    simulation: 'Simulation',
    imported: 'Imported',
    generated: 'Generated',
    clone: 'Clone',
}

export class Selection {
    constructor(graphics, guiSelection, guiOptions) {
        log('constructor');
        this.graphics = graphics;
        this.guiSelection = guiSelection;
        this.guiOptions = guiOptions;
        this.started = false;
        this.p0 = undefined;
        this.p1 = undefined;
        this.mouse0 = undefined;
        this.mouse1 = undefined;
        this.list = [];
        this.startPoint = {};
        this.source = SourceType.none;
        this.importedData = {};
        this.blob = undefined;
        this.stats = {};
    }

    start(event) {
        log('start');
        this.started = true;
        this.graphics.controls.enabled = false;
        this.mouse0 = {
            x: event.clientX,
            y: event.clientY
        };
        this.p0 = mouseToWorldCoord(mouseToScreenCoord(event), this.graphics.camera, 0);
        this.list = [];

        this.startPoint.x = event.clientX;
        this.startPoint.y = event.clientY;
    }

    update(event) {
        let pointBottomRight = {};
        let pointTopLeft = {};

        pointBottomRight.x = Math.max(this.startPoint.x, event.clientX);
        pointBottomRight.y = Math.max(this.startPoint.y, event.clientY);
        pointTopLeft.x = Math.min(this.startPoint.x, event.clientX);
        pointTopLeft.y = Math.min(this.startPoint.y, event.clientY);
    }

    end(event, mode = 'box') {
        log('end');

        this.mouse1 = {
            x: event.clientX,
            y: event.clientY
        };
        this.p1 = mouseToWorldCoord(mouseToScreenCoord(event), this.graphics.camera, 0);
        [this.mouse0, this.mouse1] = this.#topBottom(this.mouse0, this.mouse1);

        let width = this.mouse1.x - this.mouse0.x;
        let height = this.mouse0.y - this.mouse1.y;
        if (width <= 0 || height <= 0) {
            return;
        }

        if (this.#readParticleData(mode) > 0) {
            this.#snapshot(mode);
            this.source = SourceType.simulation;
            this.guiRefresh();
            this.guiSelection.open();

            UI.selection.setOpen(true);
        } else {
            this.clear();
            this.guiSelection.close();

            // UI.selection.setOpen(false);
        }

        this.graphics.controls.enabled = true;
        this.started = false;
    }

    #snapshot(mode) {
        log("#snapshot");
        this.graphics.render();
        this.graphics.renderer.domElement.toBlob((blob) => {
            blob.arrayBuffer().then((dataBuffer) => {
                Image.load(dataBuffer).then((image) => {
                    let topLeft = this.mouse0;
                    let bottomRight = this.mouse1;
                    let width = bottomRight.x - topLeft.x;
                    let height = topLeft.y - bottomRight.y;
                    switch (mode) {
                        case 'circle':
                            {
                                let p0 = new Vector3(this.mouse0.x, this.mouse0.y, 0);
                                let p1 = new Vector3(this.mouse1.x, this.mouse1.y, 0);
                                let diff = p1.clone().sub(p0);
                                let center = diff.clone().multiplyScalar(0.5).add(p0);
                                let radius = diff.length() / 2;

                                topLeft.x = center.x - radius;
                                topLeft.y = center.y + radius;
                                bottomRight.x = center.x + radius;
                                bottomRight.y = center.y - radius;
                                width = 2 * radius;
                                height = 2 * radius;
                            }
                            break;

                        case 'box':
                        default:
                            break;
                    }

                    if (width <= 0 || height <= 0) return;

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

    exportJson() {
        log('exportJson');
        if (this.list == undefined || this.list.length == 0) {
            alert("Please select particles first!");
            return;
        }

        let finalName = generateExportFilename("selection_" + this.source);
        if (this.blob != undefined) downloadFile(this.blob, finalName + '.png', "image/png");

        let content = core.exportJson(this.list);
        downloadStringToZip(content, finalName + '.json');
    }

    import(imported, filename = '') {
        this.importedData = imported;
        this.list = imported.physics.particleList;
        this.source = SourceType.imported + ' from ' + filename;
        this.guiRefresh();
    }

    clear() {
        log('clear');
        this.list = [];
        this.importedData = {};
        this.blob = undefined;
        this.stats = {};
        let view = this.guiOptions.selection;
        if (view != undefined) {
            view.particles = 0;
            view.mass = '';
            view.charge = '';
            view.nuclearCharge = '';
            view.velocity = '';
            view.velocityDir = '';
            view.center = '';
            view.source = SourceType.none;
        }
    }

    clone() {
        log('clone');
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

    #readParticleData(mode = 'box') {
        log("#readParticleData");
        log("mode = " + mode);

        this.list = [];

        this.graphics.readbackParticleData();

        let [top, bottom] = this.#topBottom(this.p0, this.p1);
        let diff = this.p1.clone().sub(this.p0);
        let center = diff.clone().multiplyScalar(0.5).add(this.p0);
        let max = Math.max(diff.x, diff.y);
        let radius = max / 2;
        let r2 = Math.pow(radius, 2);

        this.graphics.particleList.forEach(p => {
            if (p.type != ParticleType.default && p.type != ParticleType.fixed) return;
            let pos = p.position;

            switch (mode) {
                case 'box':
                default:
                    if (
                        pos.x >= top.x &&
                        pos.x <= bottom.x &&
                        pos.y >= bottom.y &&
                        pos.y <= top.y
                    ) {
                        this.list.push(p);
                    }
                    break;

                case 'circle':
                    let x = Math.pow(pos.x - center.x, 2) + Math.pow(pos.y - center.y, 2);
                    if (x < r2) {
                        this.list.push(p);
                    }
                    break;
            }
        });

        return this.list.length;
    }

    guiRefresh() {
        //log('updateView');
        let particles = this.list.length;
        if (particles > 0) {
            this.stats = calcListStatistics(this.list);
            let view = this.guiOptions.selection;
            view.source = this.source;
            view.particles = particles;
            view.mass = this.stats.totalMass.toExponential(2);
            view.charge = this.stats.totalCharge.toExponential(2);
            view.nuclearCharge = this.stats.totalNuclearCharge.toExponential(2);
            view.colorCharge = this.stats.totalColorCharge.toArray();
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