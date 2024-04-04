import { FrictionModel, NuclearPotentialType } from '../physics';
import {
    simulation,
    core,
} from '../core';

let options;
let controls;

export class GUIParameters {
    constructor(guiOptions, guiParameters) { 
        options = guiOptions;
        controls = guiParameters;
        this.setup();
     }


    setup() {
        options.parameters = {
            massConstant: '',
            chargeConstant: '',
            nuclearForceConstant: '',
            nuclearForceRange: '',
            boundaryDamping: '',
            boundaryDistance: '',
            minDistance: '',
            forceConstant: '',
            maxParticles: '',
            radius: '',
            radiusRange: '',
            nuclearPotential: NuclearPotentialType.default,
            forceMap: '[]',
            boxBoundary: false,
            distance1: false,
            enableBoundary: true,
            enableFriction: false,
            frictionConstant: '',
            frictionModel: '',
            close: () => {
                controls.close();
            },
        };

        const guiParametersConsts = controls.addFolder("[+] Constants ✏️");
        guiParametersConsts.add(options.parameters, 'massConstant').name('Gravitational Constant').listen().onFinishChange((val) => {
            core.updatePhysics('massConstant', val);
        });
        guiParametersConsts.add(options.parameters, 'chargeConstant').name('Electric Constant').listen().onFinishChange((val) => {
            core.updatePhysics('chargeConstant', val);
        });
        guiParametersConsts.add(options.parameters, 'distance1').name("Use 1/x potential (gravity and charge)").listen().onFinishChange((val) => {
            core.updatePhysics('distance1', val);
        });
        guiParametersConsts.add(options.parameters, 'nuclearForceConstant').name('Nuclear Force Constant').listen().onFinishChange((val) => {
            core.updatePhysics('nuclearForceConstant', val);
        });
        guiParametersConsts.add(options.parameters, 'nuclearForceRange').name('Nuclear Force Range').listen().onFinishChange((val) => {
            core.updatePhysics('nuclearForceRange', val);
        });
        const potentialType = {
            'Sin[ax]': NuclearPotentialType.default,
            'Hooks Law': NuclearPotentialType.hooksLaw,
            'Sin[a(1-b^x)] (v1)': NuclearPotentialType.potential_powAX,
            'Sin[a(1-b^x)] (v2)': NuclearPotentialType.potential_powAXv2,
            'Sin[a(1-b^x)]Exp[-cx]c': NuclearPotentialType.potential_powAXv3,
            'Force Map 1': NuclearPotentialType.potential_forceMap1,
            'Force Map 2': NuclearPotentialType.potential_forceMap2,
            /*'Sin[-Exp[-ax]]': NuclearPotentialType.potential_exp,
            'Sin[ax^b]': NuclearPotentialType.potential_powXR,*/
        }
        guiParametersConsts.add(options.parameters, 'nuclearPotential', potentialType).name('Nuclear Potential').listen().onFinishChange((val) => {
            core.updatePhysics('potential', val);
        });
        guiParametersConsts.add(options.parameters, 'forceMap').name('Force Map').listen().onFinishChange((val) => {
            let forceMap = String(val).split(',').map((x) => {
                let v = parseFloat(x);
                if (isNaN(v)) {
                    v = 0;
                }
                return v;
            });
            if (forceMap.length < 1 || forceMap.length > 16) {
                alert('Invalid map.');
                return;
            }
            core.updatePhysics('forceMap', forceMap);
        });
        guiParametersConsts.add(options.parameters, 'minDistance').name('Minimum Distance').listen().onFinishChange((val) => {
            let d = parseFloat(val);
            if (isNaN(d)) {
                alert('Invalid value.');
                return;
            }
            core.updatePhysics('minDistance2', Math.pow(d, 2));
        });
        guiParametersConsts.add(options.parameters, 'enableFriction').name('Enable Friction').listen().onFinishChange((val) => {
            core.updatePhysics('enableFriction', val);
        });
        guiParametersConsts.add(options.parameters, 'frictionConstant').name('Friction Constant').listen().onFinishChange((val) => {
            core.updatePhysics('frictionConstant', val);
        });
        const frictionModel = {
            '-cv (default)': FrictionModel.default,
            '-cv^2': FrictionModel.square,
        }
        guiParametersConsts.add(options.parameters, 'frictionModel', frictionModel).name('Friction Model').listen().onFinishChange((val) => {
            core.updatePhysics('frictionModel', val);
        });
        guiParametersConsts.add(options.parameters, 'forceConstant').name('Force Multiplier').listen().onFinishChange((val) => {
            core.updatePhysics('forceConstant', val);
        });
        //guiParametersConsts.open();

        const guiParametersBoundary = controls.addFolder("[+] Boundary ✏️");
        guiParametersBoundary.add(options.parameters, 'boundaryDistance').name('Boundary Distance').listen().onFinishChange((val) => {
            core.updatePhysics('boundaryDistance', val);
        });
        guiParametersBoundary.add(options.parameters, 'boundaryDamping').name('Boundary Damping Factor').listen().onFinishChange((val) => {
            core.updatePhysics('boundaryDamping', val);
        });
        guiParametersBoundary.add(options.parameters, 'boxBoundary').name('Use box boundary').listen().onFinishChange((val) => {
            core.updatePhysics('boxBoundary', val);
        });
        guiParametersBoundary.add(options.parameters, 'enableBoundary').name('Enable Boundary').listen().onFinishChange((val) => {
            core.updatePhysics('enableBoundary', val);
        });
        //guiParametersBoundary.open();

        // const guiParametersInteractions = controls.addFolder("[+] Interactions");

        controls.add(options.parameters, 'close').name('Close 🔺');

        options.collapseList.push(controls);
        options.collapseList.push(guiParametersBoundary);
        options.collapseList.push(guiParametersConsts);
        // options.collapseList.push(guiParametersInteractions);
    }

    refresh() {
        let edit = options.parameters;
        edit.massConstant = simulation.physics.massConstant.toExponential(2);
        edit.chargeConstant = simulation.physics.chargeConstant.toExponential(2);
        edit.nuclearForceConstant = simulation.physics.nuclearForceConstant.toExponential(2);
        edit.nuclearForceRange = simulation.physics.nuclearForceRange.toExponential(2);
        edit.boundaryDamping = simulation.physics.boundaryDamping;
        edit.boundaryDistance = simulation.physics.boundaryDistance.toExponential(2);
        edit.minDistance = Math.sqrt(simulation.physics.minDistance2).toExponential(2);
        edit.forceConstant = simulation.physics.forceConstant;
        edit.maxParticles = simulation.graphics.maxParticles;
        edit.boxBoundary = simulation.physics.useBoxBoundary;
        edit.distance1 = simulation.physics.useDistance1;
        edit.nuclearPotential = simulation.physics.nuclearPotential;
        edit.forceMap = simulation.physics.forceMap;
        edit.enableBoundary = simulation.physics.enableBoundary;
        edit.enableFriction = simulation.physics.enableFriction;
        edit.frictionConstant = simulation.physics.frictionConstant.toExponential(2);
        edit.frictionModel = simulation.physics.frictionModel;
    }
}