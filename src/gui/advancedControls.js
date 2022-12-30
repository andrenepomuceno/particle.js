import {
    simulation,
    core,
} from '../core.js';
import { randomSphericVector } from '../helpers.js';

export class GUIAdvancedControls {
    constructor(guiOptions, guiAdvancedControls) {
        this.options = guiOptions;
        this.controls = guiAdvancedControls;
    }

    setup() {
        this.options.advancedControls = {
            dampKickFactor: "0.1",
            randomVelocity: "10",
            cleanupThreshold: "8",
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
                    p.velocity.set(0, 0, 0);
                });
                simulation.drawParticles();
            },
            particleCleanup: () => {
                let thresh = parseFloat(this.options.advancedControls.cleanupThreshold);
                if (isNaN(thresh)) {
                    alert("Invalid threshold.");
                    return;
                }
                core.particleAutoCleanup(thresh);
            },
            dampVelocity: () => {
                let factor = parseFloat(this.options.advancedControls.dampKickFactor);
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    p.velocity.multiplyScalar(1.0 - factor);
                });
                simulation.drawParticles();
            },
            kickVelocity: () => {
                let factor = parseFloat(this.options.advancedControls.dampKickFactor);
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    p.velocity.multiplyScalar(1.0 + factor);
                });
                simulation.drawParticles();
            },
            addRandomVelocity: () => {
                simulation.graphics.readbackParticleData();
                simulation.graphics.particleList.forEach((p) => {
                    let e = parseFloat(this.options.advancedControls.randomVelocity);
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
            },
            close: () => {
                this.controls.close();
            },
        };
    
        this.controls.add(this.options.advancedControls, 'zeroVelocity').name("Zero Velocity [B]"); // [Numpad 0]
        this.controls.add(this.options.advancedControls, 'reverseVelocity').name("Reverse Velocity");
    
        this.controls.add(this.options.advancedControls, 'dampVelocity').name("Damp Velocity [T]"); // [Numpad -]
        this.controls.add(this.options.advancedControls, 'kickVelocity').name("Kick Velocity [Y]"); // [Numpad +]
        this.controls.add(this.options.advancedControls, 'dampKickFactor').name("Damp/Kick Factor").listen().onFinishChange((val) => {
            let factor = parseFloat(val);
            if (isNaN(factor) || factor > 1.0 || factor < 0.0) {
                alert("Factor must be between 0.0 and 1.0.");
                this.options.advancedControls.dampKickFactor = "0.1";
                return;
            }
            this.options.advancedControls.dampKickFactor = factor.toString();
        });
    
        this.controls.add(this.options.advancedControls, 'addRandomVelocity').name("Add Random Velocity");
        this.controls.add(this.options.advancedControls, 'randomVelocity').name("Random Velocity").listen();
    
        this.controls.add(this.options.advancedControls, 'particleCleanup').name("Automatic Particle Cleanup [U]"); // [Numpad .]
        this.controls.add(this.options.advancedControls, 'cleanupThreshold').name("Cleanup Threshold").listen();
        this.controls.add(this.options.advancedControls, 'zeroPosition').name("Zero Position");
        this.controls.add(this.options.advancedControls, 'close').name("Close");
    
        this.options.collapseList.push(this.controls);
    }
}