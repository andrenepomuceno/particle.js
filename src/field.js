import { FieldCPU } from './fieldCPU'
import { useGPU } from './simulation'

let field = undefined;

function log(msg) {
    console.log("Field: " + msg)
}

export function fieldProbeConfig(m = 0, q = 0, nq = 0) {
    log("fieldProbeConfig");
    field.probeConfig(m, q, nq);
}

export function fieldSetup(graphics, mode = "update", grid = [10, 10, 10], size = 1e3) {
    log("fieldSetup");
    if (useGPU) {

    } else {
        field = new FieldCPU(graphics);
    }
    
    if (field)
        field.setup(mode, grid, size);
}

export function fieldUpdate() {
    if (field)
        field.update();
}

export function fieldCleanup(graphics) {
    log("fieldCleanup");
    if (field)
        field.cleanup();
}

export function fieldProbe(probe) {
    if (field)
        return field.probe(probe);
}
