import {
    simulation,
    core,
} from '../core.js';
import { randomSphericVector } from '../helpers.js';
import { UI } from '../../ui/App';
import { addUIOption } from './uiHelper.js';

let options;

function addMenuControl(
    folder, title, variable,
    onFinishChange = undefined,
) {
    addUIOption({
        folder,
        title,
        variable,
        options: options.advanced,
        component: UI.advanced,
        refreshCallbacks: [], // Advanced doesn't use refresh callbacks
        onFinishChange,
        selectionList: undefined
    });
}

export class GUIAdvanced {
    constructor(guiOptions) {
        options = guiOptions;
        this.setup();
    }

    setup() {
        options.advanced = {
            dampKickFactor: '0.1',
            randomVelocity: '10',
            cleanupThreshold: '8',
            reverseVelocity: () => {
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    p.velocity.multiplyScalar(-1);
                });
                simulation.drawParticles();
            },
            zeroVelocity: () => {
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    p.velocity.multiplyScalar(1e-6);
                });
                simulation.drawParticles();
            },
            particleCleanup: () => {
                let thresh = parseFloat(options.advanced.cleanupThreshold);
                if (isNaN(thresh)) {
                    alert('Invalid threshold.');
                    return;
                }
                core.particleAutoCleanup(thresh);
            },
            dampVelocity: () => {
                let factor = parseFloat(options.advanced.dampKickFactor);
                if (isNaN(factor)) {
                    alert('Invalid value.');
                    return;
                }
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    p.velocity.multiplyScalar(1.0 - factor);
                });
                simulation.drawParticles();
            },
            kickVelocity: () => {
                let factor = parseFloat(options.advanced.dampKickFactor);
                if (isNaN(factor)) {
                    alert('Invalid value.');
                    return;
                }
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    p.velocity.multiplyScalar(1.0 + factor);''
                });
                simulation.drawParticles();
            },
            addRandomVelocity: () => {
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    let e = parseFloat(options.advanced.randomVelocity);
                    if (isNaN(e)) return;
                    p.velocity.add(randomSphericVector(0, e, simulation.mode2D));
                });
                simulation.drawParticles();
            },
            zeroPosition: () => {
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    p.position = randomSphericVector(0, 1, simulation.mode2D);
                });
                simulation.drawParticles();
            }
        };
    
        addMenuControl('advanced', 'Reverse Particles Velocity', 'reverseVelocity');
        addMenuControl('advanced', "Zero Particles Velocity [B]", 'zeroVelocity');
        addMenuControl('advanced', 'Zero Particles Position', 'zeroPosition');
        addMenuControl('advanced', "Automatic Particles Cleanup [U]", 'particleCleanup');
        addMenuControl('advanced', 'Cleanup Threshold ✏️', 'cleanupThreshold');
    }
}