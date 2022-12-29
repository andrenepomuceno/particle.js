export class Keyboard {
    constructor(mouseHelper, guiOptions) {
        this.mouseHelper = mouseHelper;
        this.guiOptions = guiOptions;

        this.onKeyDownMap = new Map();
        this.onKeyUpMap = new Map();
        this.keyMapSetup();
    }

    keyMapSetup() {
        this.onKeyDownMap.set(' ', { callback: this.guiOptions.controls.pauseResume });
        this.onKeyDownMap.set('c', { callback: this.guiOptions.controls.resetCamera });
        this.onKeyDownMap.set('r', { callback: this.guiOptions.controls.reset });
        this.onKeyDownMap.set('p', { callback: this.guiOptions.controls.snapshot });
        this.onKeyDownMap.set('i', { callback: this.guiOptions.controls.import });
        this.onKeyDownMap.set('a', { callback: this.guiOptions.controls.hideAxis });
        this.onKeyDownMap.set('v', { callback: this.guiOptions.controls.xyCamera });
        this.onKeyDownMap.set('n', { callback: this.guiOptions.controls.step });
        this.onKeyDownMap.set('q', { callback: this.guiOptions.controls.colorMode });
        this.onKeyDownMap.set('pagedown', { callback: this.guiOptions.controls.next });
        this.onKeyDownMap.set('pageup', { callback: this.guiOptions.controls.previous });
        this.onKeyDownMap.set('home', { callback: this.guiOptions.controls.home });
        this.onKeyDownMap.set('h', { callback: this.guiOptions.controls.hideOverlay });
        this.onKeyDownMap.set('z', { callback: this.guiOptions.controls.place });
        this.onKeyDownMap.set('Z', { callback: this.guiOptions.selection.clear });
        this.onKeyDownMap.set('delete', { callback: this.guiOptions.controls.deleteAll });
        this.onKeyDownMap.set('s', { callback: this.guiOptions.controls.sandbox });
        this.onKeyDownMap.set('m', { callback: this.guiOptions.controls.collapseAll });
        this.onKeyDownMap.set('~', { callback: this.guiOptions.controls.debug });
        this.onKeyDownMap.set('*', { callback: this.guiOptions.controls.record });

        this.onKeyDownMap.set('g', { callback: this.guiOptions.generator.generate });
        this.onKeyDownMap.set('G', { callback: this.guiOptions.generator.clear });

        this.onKeyDownMap.set('x', { callback: this.guiOptions.selection.clone });
        this.onKeyDownMap.set('d', { callback: this.guiOptions.selection.delete });

        this.onKeyDownMap.set('b', { callback: this.guiOptions.advancedControls.zeroVelocity });
        this.onKeyDownMap.set('t', { callback: this.guiOptions.advancedControls.dampVelocity });
        this.onKeyDownMap.set('y', { callback: this.guiOptions.advancedControls.kickVelocity });
        this.onKeyDownMap.set('u', { callback: this.guiOptions.advancedControls.particleCleanup });

        this.onKeyDownMap.set('j', {
            callback: () => {
                this.guiOptions.field.enabled = !this.guiOptions.field.enabled;
                this.guiOptions.field.enable();
            }
        });
        this.onKeyDownMap.set('f', { callback: this.guiOptions.field.fieldResize });
    }

    onKeyDown(keyboard, event) {
        if (keyboard.mouseHelper.overGUI || keyboard.onKeyDownMap == undefined) return;
        let key = event.key.toLowerCase();
        if (event.key == 'G') key = event.key;
        if (event.key == 'Z') key = event.key;
        if (keyboard.onKeyDownMap.has(key)) {
            let callback = keyboard.onKeyDownMap.get(key).callback;
            return callback();
        }
    }

    onKeyUp(keyboard, event) {
        if (keyboard.mouseHelper.overGUI || keyboard.onKeyUpMap == undefined) return;
        let key = event.key.toLowerCase();
        if (keyboard.onKeyUpMap.has(key)) {
            let callback = keyboard.onKeyUpMap.get(key).callback;
            return callback();
        }
    }
}