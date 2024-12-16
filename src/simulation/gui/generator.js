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
import { UI } from '../../ui/App';

function log(msg) {
    console.log("menu/generator: " + msg);
}

let options, controls, selection, mouse, hexagonMap;

function translateFolder(folder) {
    const regex = /[a-z]+/i;
    const result = regex.exec(folder.name)[0];
    const map = {
        'GENERATOR': 'controls',
        'Mass': 'mass',
        'Charge': 'charge',
        'Nuclear': 'nuclearCharge',
        'Velocity': 'velocity',
    }
    return map[result];
}

function addMenuControl(
    folder, title, variable,
    onFinishChange = undefined,
    variableList = undefined,
) {
    const defaultValue = options.generator[variable];

    if (onFinishChange == undefined) {
        folder.add(options.generator, variable, variableList).name(title).listen();
    }
    else {
        folder.add(options.generator, variable, variableList).name(title).listen().onFinishChange(onFinishChange);
    }

    const item = {
        title: title,
        value: defaultValue,
        onFinish: onFinishChange,
        selectionList: variableList,
        folder: translateFolder(folder)
    }
    UI.addItem(UI.generator, item);

    // if (typeof defaultValue != 'function') {
    //     refreshCallbackList.push(() => {
    //         item.value = options.generator[variable];
    //     });
    // }
}

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
                UI.generator.setOpen(true);
            },
            clear: () => {
                controls.close();
                UI.generator.setOpen(false);
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

        addMenuControl(controls, 'Particles ✏️', 'quantity', (val) => {
            options.generator.quantity = Math.round(parseFloat(val));
        });
        addMenuControl(controls, 'Brush radius ✏️', 'radius', (val) => {
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
        addMenuControl(controls, 'Brush pattern', 'pattern', (val) => {
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
        }, patternList);

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
        addMenuControl(controls, 'Particle preset', 'preset', (val) => {
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
        }, presetList);

        const guiGenerateMass = controls.addFolder("[+] Mass ✏️");
        addMenuControl(guiGenerateMass, 'Mass', 'mass', (val) => {
            options.generator.mass = parseFloat(val);
        });
        addMenuControl(guiGenerateMass, "Randomize value?", 'randomMass');
        addMenuControl(guiGenerateMass, "Allow zero?", 'enableZeroMass');
        addMenuControl(guiGenerateMass, "Round?", 'roundMass');
        //guiGenerateMass.open();

        const guiGenerateCharge = controls.addFolder("[+] Charge ✏️");
        addMenuControl(guiGenerateCharge, 'Charge', 'charge', (val) => {
            options.generator.charge = parseFloat(val);
        });
        addMenuControl(guiGenerateCharge, "Randomize value?", 'randomCharge');
        addMenuControl(guiGenerateCharge, "Randomize signal?", 'chargeRandomSignal');
        addMenuControl(guiGenerateCharge, "Allow zero?", 'enableZeroCharge');
        addMenuControl(guiGenerateCharge, "Round?", 'roundCharge');
        //guiGenerateCharge.open();

        const guiGenerateNuclearCharge = controls.addFolder("[+] Nuclear Charge ✏️");
        addMenuControl(guiGenerateNuclearCharge, 'Nuclear Charge', 'nuclearCharge', (val) => {
            options.generator.nuclearCharge = parseFloat(val);
        });
        addMenuControl(guiGenerateNuclearCharge, "Randomize value?", 'randomNuclearCharge');
        addMenuControl(guiGenerateNuclearCharge, "Randomize signal?", 'nuclearChargeRandomSignal');
        addMenuControl(guiGenerateNuclearCharge, "Allow zero?", 'enableZeroNuclearCharge');
        addMenuControl(guiGenerateNuclearCharge, "Round?", 'roundNuclearCharge');

        const guiGenerateVelocity = controls.addFolder("[+] Velocity ✏️");
        addMenuControl(guiGenerateVelocity, 'Velocity', 'velocity', (val) => {
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
        addMenuControl(guiGenerateVelocity, "Randomize?", 'randomVelocity');

        addMenuControl(controls, "Fixed position?", 'fixed');
        addMenuControl(controls, "Generate [G]", 'generate');
        addMenuControl(controls, 'Default Values', 'default');
        controls.add(options.generator, 'clear').name('Close 🔺');

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