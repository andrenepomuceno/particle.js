import { UI } from '../../ui/App';
import { addUIOption } from './uiHelper.js';
import { simulation, core } from '../core.js';
import { NuclearPotentialType, FrictionModel } from '../physics.js';

let options;
let refreshCallbackList = [];

function addPhysicsControl(
    folder, title, variable, defaultValue = '',
    refreshCallback = undefined,
    variableList = undefined,
    onFinishChange = undefined,
) {
    options.parameters[variable] = defaultValue;
    const onFinish = (val) => {
        core.updatePhysics(variable, val);
    };
    if (onFinishChange == undefined) {
        onFinishChange = onFinish;
    }

    if (refreshCallback != undefined) {
        refreshCallbackList.push(refreshCallback);
    }

    addUIOption({
        folder,
        title,
        variable,
        options: options.parameters,
        component: UI.parameters,
        refreshCallbacks: refreshCallbackList,
        onFinishChange,
        selectionList: variableList
    });
}

export class GUIParameters {
    constructor(guiOptions) {
        options = guiOptions;
        this.setup();
    }

    setup() {
        options.parameters = {
            forceMap: '[]',
            minDistance: '',
        };

        addPhysicsControl('forces', 'Gravitational Constant', 'massConstant', '', () => {
            options.parameters.massConstant = simulation.physics.massConstant.toExponential(4);
        });
        addPhysicsControl('forces', 'Electric Constant', 'chargeConstant', '', () => {
            options.parameters.chargeConstant = simulation.physics.chargeConstant.toExponential(4);
        });
        addPhysicsControl('forces', 'x^-1 potential', 'distance1', false, () => {
            options.parameters.distance1 = simulation.physics.useDistance1;
        });

        const potentialType = {
            'Sin[ax]': NuclearPotentialType.default,
            "2x-1": NuclearPotentialType.hooksLaw,
            'Sin[a(1-b^x)] (v1)': NuclearPotentialType.potential_powAX,
            'Sin[a(1-b^x)] (v2)': NuclearPotentialType.potential_powAXv2,
            'Sin[a(1-b^x)]Exp[-cx]c': NuclearPotentialType.potential_powAXv3,
            '[a,b,c,d,...,x] (param.)': NuclearPotentialType.potential_forceMap1,
            'aExp(-x/b)-cx (param.)': NuclearPotentialType.potential_forceMap2,
            'Lennard-Jones (param.)': NuclearPotentialType.lennardJones,
            /*'Sin[-Exp[-ax]]': NuclearPotentialType.potential_exp,
            'Sin[ax^b]': NuclearPotentialType.potential_powXR,*/
        };
        addPhysicsControl('nuclear', 'Nuclear Potential', 'nuclearPotential', '', () => {
            options.parameters.nuclearPotential = simulation.physics.nuclearPotential;
        }, potentialType);

        const onFinishMap = (val) => {
            let forceMap = String(val).split(',').map((x) => {
                let v = parseFloat(x);
                if (isNaN(v)) {
                    v = 0;
                }
                return v;
            });
            if (forceMap.length < 1 || forceMap.length > 128) {
                alert('Invalid map.');
                return;
            }
            core.updatePhysics('forceMap', forceMap);
        };
        addPhysicsControl('nuclear', 'Nuclear Parameters', 'forceMap', '', undefined, undefined, onFinishMap);

        addPhysicsControl('nuclear', 'Nuclear Force Constant', 'nuclearForceConstant', '', () => {
            options.parameters.nuclearForceConstant = simulation.physics.nuclearForceConstant.toExponential(4);
        });
        addPhysicsControl('nuclear', 'Nuclear Force Range', 'nuclearForceRange', '', () => {
            options.parameters.nuclearForceRange = simulation.physics.nuclearForceRange.toExponential(4);
        });

        addPhysicsControl('nuclear', 'Enable Color Charge', 'enableColorCharge', false, () => {
            options.parameters.enableColorCharge = simulation.physics.enableColorCharge;
        });
        addPhysicsControl('nuclear', 'Color Force Constant', 'colorChargeConstant', '', () => {
            options.parameters.colorChargeConstant = simulation.physics.colorChargeConstant.toExponential(4);
        });

        addPhysicsControl('friction', 'Enable Friction', 'enableFriction', false, () => {
            options.parameters.enableFriction = simulation.physics.enableFriction;
        });
        const frictionModel = {
            '-cv': FrictionModel.default,
            '-cv^2': FrictionModel.square,
        }
        addPhysicsControl('friction', 'Friction Model', 'frictionModel', '', () => {
            options.parameters.frictionModel = simulation.physics.frictionModel;
        }, frictionModel);
        addPhysicsControl('friction', 'Friction Constant', 'frictionConstant', '', () => {
            options.parameters.frictionConstant = simulation.physics.frictionConstant.toExponential(4);
        });
        addPhysicsControl('other', 'Time Step', 'timeStep', '', () => {
            options.parameters.timeStep = simulation.physics.timeStep.toFixed(4);
        });
        addPhysicsControl('other', 'Max Velocity (C)', 'maxVel', '', () => {
            options.parameters.maxVel = simulation.physics.maxVel.toExponential(4);
        });
        const onFinishMinDistance = (val) => {
            let d = parseFloat(val);
            if (isNaN(d)) {
                alert('Invalid value.');
                return;
            }
            core.updatePhysics('minDistance2', Math.pow(d, 2));
        };

        addPhysicsControl('other', 'Collision Distance', 'minDistance', '', undefined, undefined, onFinishMinDistance);
        addPhysicsControl('other', 'Enable Random Noise', 'enableRandomNoise', false, () => {
            options.parameters.enableRandomNoise = simulation.physics.enableRandomNoise;
        });
        addPhysicsControl('other', 'Random Noise Constant', 'randomNoiseConstant', '', () => {
            options.parameters.randomNoiseConstant = simulation.physics.randomNoiseConstant.toExponential(4);
        });
        addPhysicsControl('other', '2D Mode', 'mode2D', true, () => {
            options.parameters.mode2D = simulation.mode2D;
        },
            undefined,
            (val) => {
                console.log(simulation);
                simulation.bidimensionalMode(val);
                core.updatePhysics('mode2D', val);
            });

        addPhysicsControl('boundaries', 'Boundary Distance', 'boundaryDistance', '', () => {
            options.parameters.boundaryDistance = simulation.physics.boundaryDistance.toExponential(4);
        });
        addPhysicsControl('boundaries', 'Boundary Damping Factor', 'boundaryDamping', '', () => {
            options.parameters.boundaryDamping = simulation.physics.boundaryDamping.toFixed(4);
        });
        addPhysicsControl('boundaries', 'Use box boundary', 'boxBoundary', false, () => {
            options.parameters.boxBoundary = simulation.physics.useBoxBoundary;
        });
        addPhysicsControl('boundaries', 'Enable Boundary', 'enableBoundary', false, () => {
            options.parameters.enableBoundary = simulation.physics.enableBoundary;
        });

        addPhysicsControl('experimental', 'Enable Fine Structure', 'enableFineStructure', false, () => {
            options.parameters.enableFineStructure = simulation.physics.enableFineStructure;
        });
        addPhysicsControl('experimental', 'Fine Structure Constant', 'fineStructureConstant', '', () => {
            options.parameters.fineStructureConstant = Number(simulation.physics.fineStructureConstant).toExponential(4);
        });
        addPhysicsControl('experimental', 'Enable Lorentz Factor', 'enableLorentzFactor', false, () => {
            options.parameters.enableLorentzFactor = simulation.physics.enableLorentzFactor;
        });
        addPhysicsControl('experimental', 'Post-Newtonian Gravity', 'enablePostGravity', false, () => {
            options.parameters.enablePostGravity = simulation.physics.enablePostGravity;
        });
    }

    refresh() {
        let edit = options.parameters;

        edit.minDistance = Math.sqrt(simulation.physics.minDistance2).toExponential(4);
        edit.forceMap = simulation.physics.forceMap;

        refreshCallbackList.forEach((callback) => {
            if (callback != undefined) {
                callback();
            }
        })
    }
}