import { Vector3 } from 'three';
import {
    decodeVector3, random, floatArrayToString,
    generateHexagon,
    createParticles
} from '../helpers.js';
import {
    simulation,
    core,
} from '../core.js';
import { randomSphericVector } from '../helpers.js';
import { Selection, SourceType } from '../components/selection';
import { createParticle, randomVector } from '../scenariosHelpers.js';
import { scaleEPN } from '../physics.js';

function log(msg) {
    console.log("menu/generator: " + msg);
}

let options, controls, selection, mouse, hexagonMap;

export class GUIGenerator {
    constructor(guiOptions, guiGenerator) {
        options = guiOptions;
        controls = guiGenerator;
        mouse = options.mouseHelper;
        selection = options.selectionHelper;
        hexagonMap = new Map();
        this.setup();
    }

    setup() {
        options.generator = {
            mass: '1',
            randomMass: false,
            enableZeroMass: false,
            roundMass: true,

            charge: '1',
            randomCharge: false,
            chargeRandomSignal: true,
            enableZeroCharge: false,
            roundCharge: true,

            nuclearCharge: '1',
            randomNuclearCharge: false,
            nuclearChargeRandomSignal: true,
            enableZeroNuclearCharge: false,
            roundNuclearCharge: true,

            velocity: "1,0,0",
            randomVelocity: true,

            radius: '1',
            quantity: '1',
            pattern: 'circle',
            preset: 'default',
            fixed: false,
            generate: () => {
                particleGenerator(options.generator);
                controls.open();
            },
            clear: () => {
                controls.close();
            },
            default: () => {
                let clean = {
                    mass: '1',
                    randomMass: false,
                    enableZeroMass: false,
                    roundMass: true,

                    charge: '1',
                    randomCharge: false,
                    chargeRandomSignal: true,
                    enableZeroCharge: false,
                    roundCharge: true,

                    nuclearCharge: '1',
                    randomNuclearCharge: false,
                    nuclearChargeRandomSignal: true,
                    enableZeroNuclearCharge: false,
                    roundNuclearCharge: true,

                    velocity: "1,0,0",
                    randomVelocity: true,

                    radius: '1',
                    quantity: '1',
                    pattern: 'circle',
                    preset: 'default',
                    fixed: false,
                };
                Object.assign(options.generator, clean);
            },
        };

        controls.add(options.generator, 'quantity').name('Particles').listen().onFinishChange((val) => {
            options.generator.quantity = Math.round(parseFloat(val));
        });
        controls.add(options.generator, 'radius').name('Brush radius').listen().onFinishChange((val) => {
            options.generator.radius = parseFloat(val);
        });

        function defaultTemplate() {
            options.generator.mass = '1';
            options.generator.randomMass = false;
            options.generator.enableZeroMass = false;
            options.generator.roundMass = false;

            options.generator.charge = '1';
            options.generator.randomCharge = false;
            options.generator.chargeRandomSignal = false;
            options.generator.enableZeroCharge = true;
            options.generator.roundCharge = false;

            options.generator.nuclearCharge = '1';
            options.generator.randomNuclearCharge = false;
            options.generator.nuclearChargeRandomSignal = true;
            options.generator.enableZeroNuclearCharge = false;
            options.generator.roundNuclearCharge = true;
        }

        function beamTemplate(v) {
            options.generator.velocity = v + ",0,0";
            options.generator.randomVelocity = false;
        }

        const patternList = {
            Circle: 'circle',
            Square: 'square',
            Hexagon: 'hexagon',
            Beam: 'beam',
        };
        controls.add(options.generator, 'pattern', patternList).name('Brush pattern').listen().onFinishChange((val) => {
            switch (val) {
                case 'beam':
                    let v = 10 * parseFloat(options.info.velocity);
                    if (isNaN(v) || v < 1e2) v = 1e2;
                    beamTemplate(v);
                    options.generator.quantity = 16;
                    break;

                default:
                    break;
            }
        });

        const presetList = {
            'Default': 'default',
            'Random Clone': 'randomClone',
            'E Beam': 'eBeam',
            'Alpha Beam': 'alphaBeam',
            'Quark Model': 'stdModel0',
            'EPN': 'epnModel',
            'EPN Model (Scale)': 'epnModelScaled',
            'Quark Model (Scale)': 'stdModel0Scaled',
        };
        controls.add(options.generator, 'preset', presetList).name('Particle preset').listen().onFinishChange((val) => {
            let v = 10 * parseFloat(options.info.velocity);
            if (isNaN(v) || v < 1e2) v = 1e2;
            switch (val) {
                case 'eBeam':
                    defaultTemplate();
                    beamTemplate(v);
                    options.generator.quantity = '32';
                    break;

                case 'alphaBeam':
                    defaultTemplate();
                    beamTemplate(v);
                    options.generator.quantity = '24';
                    options.generator.nuclearChargeRandomSignal = false;
                    break;

                case 'epnModel':
                case 'stdModel0':
                case 'randomClone':
                case 'stdModel0Scaled':
                case 'epnModelScaled':
                    defaultTemplate();
                    break;

                default:
                    options.generator.default();
                    break;
            }
        });

        const guiGenerateMass = controls.addFolder("[+] Mass");
        guiGenerateMass.add(options.generator, 'mass').name('Mass').listen().onFinishChange((val) => {
            options.generator.mass = parseFloat(val);
        });
        guiGenerateMass.add(options.generator, 'randomMass').name("Randomize value?").listen();
        guiGenerateMass.add(options.generator, 'enableZeroMass').name("Allow zero?").listen();
        guiGenerateMass.add(options.generator, 'roundMass').name("Round?").listen();
        //guiGenerateMass.open();

        const guiGenerateCharge = controls.addFolder("[+] Charge");
        guiGenerateCharge.add(options.generator, 'charge').name('Charge').listen().onFinishChange((val) => {
            options.generator.charge = parseFloat(val);
        });
        guiGenerateCharge.add(options.generator, 'randomCharge').name("Randomize value?").listen();
        guiGenerateCharge.add(options.generator, 'chargeRandomSignal').name("Randomize signal?").listen();
        guiGenerateCharge.add(options.generator, 'enableZeroCharge').name("Allow zero?").listen();
        guiGenerateCharge.add(options.generator, 'roundCharge').name("Round?").listen();
        //guiGenerateCharge.open();

        const guiGenerateNuclearCharge = controls.addFolder("[+] Nuclear Charge");
        guiGenerateNuclearCharge.add(options.generator, 'nuclearCharge').name('Nuclear Charge').listen().onFinishChange((val) => {
            options.generator.nuclearCharge = parseFloat(val);
        });
        guiGenerateNuclearCharge.add(options.generator, 'randomNuclearCharge').name("Randomize value?").listen();
        guiGenerateNuclearCharge.add(options.generator, 'nuclearChargeRandomSignal').name("Randomize signal?").listen();
        guiGenerateNuclearCharge.add(options.generator, 'enableZeroNuclearCharge').name("Allow zero?").listen();
        guiGenerateNuclearCharge.add(options.generator, 'roundNuclearCharge').name("Round?").listen();

        const guiGenerateVelocity = controls.addFolder("[+] Velocity");
        guiGenerateVelocity.add(options.generator, 'velocity').name('Velocity').listen().onFinishChange((val) => {
            const precision = 2;
            let velocity = decodeVector3(val);
            if (velocity != undefined) {
                options.generator.velocity = floatArrayToString([velocity.x, velocity.y, velocity.z], precision);
                return;
            }
            velocity = parseFloat(val);
            if (isNaN(velocity)) {
                alert('Invalid velocity.');
                options.generator.velocity = '0';
                return;
            }
            options.generator.velocity = floatArrayToString([velocity, 0, 0], precision);
        });
        guiGenerateVelocity.add(options.generator, 'randomVelocity').name("Randomize?").listen();

        controls.add(options.generator, 'fixed').name("Fixed position?").listen();
        controls.add(options.generator, 'generate').name("Generate [G]");
        controls.add(options.generator, 'default').name('Default Values');
        controls.add(options.generator, 'clear').name('Close');

        options.collapseList.push(controls);
        options.collapseList.push(guiGenerateCharge);
        options.collapseList.push(guiGenerateMass);
        options.collapseList.push(guiGenerateVelocity);
    }

    refresh() {

    }

    cleanup() {

    }
}

function particleGenerator(input) {
    log('generateParticles');

    function generatePosition() {
        switch (input.pattern) {
            case 'circle':
                return randomSphericVector(0, radius);

            case 'square':
                return randomVector(radius);

            case 'hexagon':
                {
                    log(hexagonMap.size);
                    if (hexagonMap.size == 0) {
                        generateHexagon(0, 0, radius, hexagonMap);
                    }

                    let idx = random(0, 256, true) % (hexagonMap.size);
                    let pos = new Vector3();
                    for (let [key, value] of hexagonMap) {
                        if (idx-- == 0) {
                            pos.set(value.x, value.y, 0);
                            hexagonMap.delete(key);
                            break;
                        }
                    }

                    return pos;
                }

            default:
                return new Vector3();
        }
    }

    function generateVelocity() {
        let v = velocity;
        switch (input.pattern) {
            case 'beam':
                break;

            default:
                if (options.generator.randomVelocity) v = randomSphericVector(0, v.length(), simulation.mode2D);
                break;
        }

        if (Date.now() - mouse.lastMove < 1000) {
            let mv = mouse.avgVelocity();
            let mouseVelocity = new Vector3(mv.x, mv.y, 0);
            mouseVelocity.multiplyScalar(0.005 * simulation.graphics.controls.getDistance());
            //console.log(mouseVelocity);
            v.add(mouseVelocity);
        }

        return v;
    }

    let mass = parseFloat(input.mass);
    let charge = parseFloat(input.charge);
    let nuclearCharge = parseFloat(input.nuclearCharge);
    let radius = Math.abs(parseFloat(input.radius));
    let quantity = Math.round(parseFloat(input.quantity));
    if (isNaN(mass) || isNaN(charge) || isNaN(nuclearCharge) || isNaN(radius) || isNaN(quantity)) {
        alert("Invalid parameters!");
        return;
    }
    let velocity = decodeVector3(input.velocity);
    if (velocity == undefined) {
        velocity = parseFloat(input.velocity);
        if (isNaN(velocity)) {
            alert("Invalid velocity!");
            return;
        }
        velocity = { x: velocity, y: 0, z: 0 };
    }
    velocity = new Vector3(velocity.x, velocity.y, velocity.z);

    let presetList = [];
    let presetIdx = 0;
    let preset = input.preset;
    switch (preset) {
        case 'stdModel0':
            presetList = [
                { m: 0.01, q: 0, nq: 1 },
                { m: 0.511, q: -1, nq: 1 },
                { m: 3, q: 1 / 3, nq: 1 },
                { m: 6, q: -2 / 3, nq: 1 },
            ];
            break;

        case 'epnModel':
            presetList = [
                { m: 5.48579909065e-4, q: -1, nq: -1 / 137 },
                { m: 1.007276466583, q: 1, nq: 1 },
                { m: 1.00866491588, q: 0, nq: 1 },
            ];
            break;

        case 'epnModelScaled':
            presetList = [
                { m: 9.1093837015e-31 * scaleEPN.kg, q: -1.602176634e-19 * scaleEPN.c, nq: -1 / 60, name: 'electron' },
                { m: 1.67262192e-27 * scaleEPN.kg, q: 1.602176634e-19 * scaleEPN.c, nq: 1, name: 'proton' },
                { m: 1.67492749e-27 * scaleEPN.kg, q: 0, nq: 1, name: 'netron' },
            ];
            break;

        case 'quarkModelScaled':
            presetList = [
                { m: 9.1093837015e-31 * scaleEPN.kg, q: -1.602176634e-19 * scaleEPN.c, nq: -1, name: 'electron' },
                { m: 5.347988087839e-30 * scaleEPN.kg, q: 2 / 3 * 1.602176634e-19 * scaleEPN.c, nq: 1, name: 'quark up' }, // 3 MeV
                { m: 1.069597617568e-29 * scaleEPN.kg, q: -1 / 3 * 1.602176634e-19 * scaleEPN.c, nq: 1, name: 'quark down' }, // 6 MeV
            ];
            break;

        case 'randomClone':
            {
                presetList = [];
                for (let i = 0; i < quantity; ++i) {
                    let idx = random(0, simulation.particleList.length - 1, true);
                    let p = simulation.particleList[idx];
                    presetList.push(
                        { m: p.mass, q: p.charge, nq: p.nuclearCharge }
                    );
                }
            }
            break;

        case 'eBeam':
            presetList = [
                { m: 0.511, q: -1, nq: 1 },
            ];
            break;

        case 'alphaBeam':
            presetList = [
                { m: 3, q: 1 / 3, nq: 1 },
                { m: 6, q: -2 / 3, nq: 1 },
            ];
            break;

        default:
            presetList = [
                { m: 1, q: 1, nq: 1 },
            ];
            break;
    }

    let dummySimulation = { mode2D: simulation.mode2D, physics: { particleList: [] } };
    //if (input.pattern == 'hexagon') quantity *= 6;
    for (let i = 0; i < quantity; ++i) {
        const opt = {
            randomSequence: true,

            randomM: options.generator.randomMass,
            roundM: options.generator.roundMass,
            allowZeroM: options.generator.enableZeroMass,

            randomQSignal: options.generator.chargeRandomSignal,
            randomQ: options.generator.randomCharge,
            roundQ: options.generator.roundCharge,
            allowZeroQ: options.generator.enableZeroCharge,

            randomNQSignal: options.generator.nuclearChargeRandomSignal,
            randomNQ: options.generator.randomNuclearCharge,
            roundNQ: options.generator.roundNuclearCharge,
            allowZeroNQ: options.generator.enableZeroNuclearCharge,

            center: generatePosition(),

            randomVelocity: false,
            v1: generateVelocity(),
        };
        createParticles(dummySimulation, presetList, 1, opt);
    }

    selection.clear();
    selection.source = SourceType.generated;
    selection.list = dummySimulation.physics.particleList;
    selection.guiRefresh();
}