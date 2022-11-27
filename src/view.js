import { Box2, Color, Vector2, Vector3 } from 'three';
import * as dat from 'dat.gui';
import { Particle } from './physics.js';
import { downloadFile, arrayToString, mouseToScreenCoord, cameraToWorldCoord } from './helpers.js';
import {
    simulationSetup,
    simulationExportCsv,
    setColorMode,
    graphics,
    useGPU,
    simulationImportCSV,
    simulation,
    simulationUpdatePhysics,
    simulationUpdateParticle,
    simulationFindParticle,
    simulationUpdateParticleList as simulationUpdateParticleList,
    simulationImportSelectionCSV,
    simulationCreateParticles,
    simulationDelete,
} from './simulation.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { SelectionHelper } from './selectionHelper.js';

let hideAxis = false;
let simulationIdx = 0;
let colorMode = "charge";

let nextFrame = false;
let pause = false;
let followParticle = false;
let mousePosition = new Vector2(1e5, 1e5);
let mouseOverGUI = false;
const viewUpdateDelay = 1000;
let lastViewUpdate = 0;
let lastAnimateTime = 0;
let updateField = false;
let selection = new SelectionHelper();

let stats = new Stats();
const gui = new dat.GUI();
//export const gui = new GUI();
const guiInfo = gui.addFolder("Global Info");
const guiControls = gui.addFolder("Controls (keyboard shortcuts)");
const guiParticle = gui.addFolder("Particle Info (click on particle or enter ID)");
const guiParameters = gui.addFolder("Simulation Parameters");
const guiSelection = gui.addFolder("Selection Info (select with shift + click/drag");
const guiCreate = gui.addFolder("Create (Work in progress)");

function setup(idx) {
    selectionReset();
    resetParticleView();
    simulationSetup(idx);
    resetEditView();
    updateInfoView();
}

function uploadCsv(callback) {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = ".csv";
    input.onchange = e => {
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = readerEvent => {
            let content = readerEvent.target.result;
            callback(file.name, content);
        }
    }
    input.click();
}

export let guiOptions = {
    controls: {
        pauseResume: function () {
            pause = !pause;
        },
        step: function () {
            nextFrame = true;
        },
        reset: function () {
            setup();
        },
        next: function () {
            setup(++simulationIdx);
        },
        previous: function () {
            if (simulationIdx > 0)
                setup(--simulationIdx);
        },
        snapshot: function () {
            snapshot();
        },
        import: function () {
            uploadCsv((name, content) => {
                resetParticleView();
                simulationImportCSV(name, content);
                resetEditView();
                updateInfoView();
            });
        },
        hideAxis: function () {
            hideAxis = !hideAxis;
            graphics.showAxis(!hideAxis);
        },
        resetCamera: function () {
            resetParticleView(false);
            graphics.controls.reset();
        },
        xyCamera: function () {
            resetParticleView(false);
            graphics.camera.position.set(0, 0, graphics.cameraDistance);
            graphics.controls.target.set(0, 0, 0);
            graphics.controls.update();
        },
        colorMode: function () {
            (colorMode == "charge") ? (colorMode = "random") : (colorMode = "charge");
            setColorMode(colorMode);
        },
        placeHint: function () {
            alert(
                "Press 'Z' to place a particle selection on the mouse/pointer position.\n" +
                "First, select particles with SHIFT + CLICK/DRAG, then press 'Z' to make clones!"
            );
        },
        wip: function () {
            alert("Work in progress!");
        },
        home: function () {
            simulationIdx = 0;
            setup(simulationIdx);
        },
        mouseHint: () => {
            alert(
                "LEFT BUTTON: select particle/camera rotation (3D mode only)\n" +
                "MIDDLE BUTTON/SCROLL: zoom.\n" +
                "RIGHT BUTTON: move camera position.\n" +
                "SHIFT+LEFT CLICK/DRAG: mass selection."
            );
        }
    },
    info: {
        name: "",
        particles: 0,
        energy: "",
        time: "",
        collisions: 0,
        mass: "",
        radius: "",
        charge: "",
        cameraDistance: "",
        mode: "",
    },
    particle: {
        obj: undefined,
        id: "",
        mass: "",
        charge: "",
        nearCharge: "",
        position: "",
        velocityDir: "",
        velocityAbs: "",
        color: "#000000",
        field: {
            direction: "",
            amplitude: "",
        },
        energy: "",
        follow: function () {
            followParticle = !followParticle;
        },
        lookAt: function () {
            let x = guiOptions.particle.obj.position;

            graphics.camera.position.set(x.x, x.y, graphics.controls.getDistance());
            graphics.controls.target.set(x.x, x.y, x.z);
            graphics.controls.update();

            //graphics.controls.target.set(x.x, x.y, x.z);
        },
        close: function () {
            resetParticleView();
        },
        reset: () => {
            simulationUpdateParticle(guiOptions.particle.obj, "reset", 0);
        },
        delete: () => {

        },
    },
    parameters: {
        massConstant: "",
        chargeConstant: "",
        nearChargeConstant: "",
        nearChargeRange: "",
        boundaryDamping: "",
        boundaryDistance: "",
        minDistance2: "",
        forceConstant: "",
        maxParticles: "",
        radius: "",
        radiusRange: "",
        close: () => {
            guiParameters.close();
        },
    },
    selection: {
        source: "",
        particles: 0,
        mass: "",
        charge: "",
        nearCharge: "",
        velocity: "",
        velocityDir: "",
        center: "",
        export: () => {
            selection.export();
        },
        import: () => {
            uploadCsv((name, content) => {
                selection = new SelectionHelper(graphics, guiOptions.selection, guiSelection);
                simulationImportSelectionCSV(selection, name, content);
            });
        },
        clone: () => {
            selection.clone();
            selection.updateView();
        },
        clear: () => {
            selectionReset();
        },
        delete: () => {
            if (selection.source != "simulation") {
                alert('Selection source must be "simulation".\n Select particles first.');
                return;
            }
            simulationDelete(selection.list);
            selectionReset();
        }
    },
    create: {
        mass: "1",
        charge: "1",
        nearCharge: "1",
        velocity: "1,0,0",
        radius: "100",
        quantity: "8",
        create: () => {

        }
    },
}

export function guiSetup() {
    //gui.width = 300;

    function mouseOver() {
        mouseOverGUI = true;
    }
    function mouseLeave() {
        mouseOverGUI = false;
    }

    document.getElementById("container").appendChild(stats.dom);
    stats.domElement.addEventListener("mouseover", mouseOver);
    stats.domElement.addEventListener("mouseleave", mouseLeave);

    gui.domElement.addEventListener("mouseover", mouseOver);
    gui.domElement.addEventListener("mouseleave", mouseLeave);

    guiInfo.add(guiOptions.info, 'name').name('Name').listen().onFinishChange((val) => {
        simulation.name = val;
    });
    guiInfo.add(guiOptions.info, 'particles').name('Particles').listen();
    guiInfo.add(guiOptions.info, 'time').name('Time').listen();
    guiInfo.add(guiOptions.info, 'mass').name('Mass (sum)').listen().onFinishChange((val) => {
        simulationUpdateParticleList("mass", val);
    });
    guiInfo.add(guiOptions.info, 'charge').name('Charge (sum)').listen().onFinishChange((val) => {
        simulationUpdateParticleList("charge", val);
    });;
    guiInfo.add(guiOptions.info, 'energy').name('Energy (avg)').listen();
    guiInfo.add(guiOptions.info, 'collisions').name('Collisions').listen();
    //guiInfo.add(guiOptions.info, 'radius').name('Radius').listen();
    guiInfo.add(guiOptions.info, 'cameraDistance').name('Camera Distance').listen();
    guiInfo.add(guiOptions.info, 'mode').name('Mode').listen();
    guiInfo.open();

    guiControls.add(guiOptions.controls, 'mouseHint').name("Mouse Controls (click for more...)");
    guiControls.add(guiOptions.controls, 'placeHint').name("Insert selection [Z] (click for more...)");
    guiControls.add(guiOptions.controls, 'pauseResume').name("Pause/Resume [SPACE]");
    guiControls.add(guiOptions.controls, 'step').name("Step [N]");
    guiControls.add(guiOptions.controls, 'reset').name("Reset [R]");
    guiControls.add(guiOptions.controls, 'next').name("Next [PAGEDOWN]");
    guiControls.add(guiOptions.controls, 'previous').name("Previous [PAGEUP]");
    guiControls.add(guiOptions.controls, 'snapshot').name("Export [P]");
    guiControls.add(guiOptions.controls, 'import').name("Import");
    guiControls.add(guiOptions.controls, 'hideAxis').name("Hide/Show Axis [A]");
    guiControls.add(guiOptions.controls, 'resetCamera').name("Reset Camera [C]");
    guiControls.add(guiOptions.controls, 'xyCamera').name("XY Camera [V]");
    guiControls.add(guiOptions.controls, 'colorMode').name("Color Mode [Q]");
    guiControls.add(guiOptions.controls, 'home').name("Home [HOME]");
    guiControls.add(guiOptions.controls, 'wip').name("Sandbox Mode [WIP]");

    guiParticle.add(guiOptions.particle, 'id').name('ID').listen().onFinishChange((val) => {
        let obj = simulationFindParticle(parseInt(val));
        if (obj) {
            guiOptions.particle.obj = obj;
        }
    });
    guiParticle.add(guiOptions.particle, 'mass').name('Mass').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "mass", val);
    });
    guiParticle.add(guiOptions.particle, 'charge').name('Charge').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "charge", val);
    });
    guiParticle.add(guiOptions.particle, 'nearCharge').name('NearCharge').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "nearCharge", val);
    });
    guiParticle.add(guiOptions.particle, 'position').name('Position').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "position", val);
    });
    guiParticle.add(guiOptions.particle, 'velocityAbs').name('Velocity').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "velocityAbs", val);
    });
    guiParticle.add(guiOptions.particle, 'velocityDir').name('Direction').listen().onFinishChange((val) => {
        simulationUpdateParticle(guiOptions.particle.obj, "velocityDir", val);
    });
    guiParticle.addColor(guiOptions.particle, 'color').name('Color').listen();
    guiParticle.add(guiOptions.particle.field, 'amplitude').name('Field Force').listen();
    guiParticle.add(guiOptions.particle.field, 'direction').name('Field Dir.').listen();
    guiParticle.add(guiOptions.particle, 'energy').name('Energy').listen();
    guiParticle.add(guiOptions.particle, 'follow').name('Follow/Unfollow');
    guiParticle.add(guiOptions.particle, 'lookAt').name('Look At');
    guiParticle.add(guiOptions.particle, 'reset').name('Reset');
    guiParticle.add(guiOptions.particle, 'close').name('Close');

    guiParameters.add(guiOptions.parameters, 'massConstant').name("massConstant").listen().onFinishChange((val) => {
        simulationUpdatePhysics("massConstant", val);
    });
    guiParameters.add(guiOptions.parameters, 'chargeConstant').name("chargeConstant").listen().onFinishChange((val) => {
        simulationUpdatePhysics("chargeConstant", val);
    });
    guiParameters.add(guiOptions.parameters, 'nearChargeConstant').name("nearChargeConstant").listen().onFinishChange((val) => {
        simulationUpdatePhysics("nearChargeConstant", val);
    });
    guiParameters.add(guiOptions.parameters, 'nearChargeRange').name("nearChargeRange").listen().onFinishChange((val) => {
        simulationUpdatePhysics("nearChargeRange", val);
    });
    guiParameters.add(guiOptions.parameters, 'boundaryDamping').name("boundaryDamping").listen().onFinishChange((val) => {
        simulationUpdatePhysics("boundaryDamping", val);
    });
    guiParameters.add(guiOptions.parameters, 'boundaryDistance').name("boundaryDistance").listen().onFinishChange((val) => {
        simulationUpdatePhysics("boundaryDistance", val);
    });
    guiParameters.add(guiOptions.parameters, 'minDistance2').name("minDistance2").listen().onFinishChange((val) => {
        simulationUpdatePhysics("minDistance2", val);
    });
    guiParameters.add(guiOptions.parameters, 'forceConstant').name("forceConstant").listen().onFinishChange((val) => {
        simulationUpdatePhysics("forceConstant", val);
    });
    guiParameters.add(guiOptions.parameters, 'radius').name("radius").listen().onFinishChange((val) => {
        simulationUpdatePhysics("radius", val);
    });
    guiParameters.add(guiOptions.parameters, 'radiusRange').name("radiusRange").listen().onFinishChange((val) => {
        simulationUpdatePhysics("radiusRange", val);
    });
    guiParameters.add(guiOptions.parameters, 'maxParticles').name("maxParticles").listen().onFinishChange((val) => {
        val = parseFloat(val);
        if (val != simulation.physics.particleList.length) {
            graphics.setMaxParticles(val);
            setup();
        }
    });
    guiParameters.add(guiOptions.parameters, 'close').name("Close");

    guiSelection.add(guiOptions.selection, 'source').name("source").listen();
    guiSelection.add(guiOptions.selection, 'particles').name("particles").listen();
    guiSelection.add(guiOptions.selection, 'mass').name("mass").listen().onFinishChange((val) => {
        selectionUpdate("mass", val);
    });
    guiSelection.add(guiOptions.selection, 'charge').name("charge").listen().onFinishChange((val) => {
        selectionUpdate("charge", val);
    });
    guiSelection.add(guiOptions.selection, 'nearCharge').name("nearCharge").listen().onFinishChange((val) => {
        selectionUpdate("nearCharge", val);
    });
    guiSelection.add(guiOptions.selection, 'velocity').name("velocity").listen().onFinishChange((val) => {
        selectionUpdate("velocityAbs", val);
    });
    guiSelection.add(guiOptions.selection, 'velocityDir').name("direction").listen().onFinishChange((val) => {
        selectionUpdate("velocityDir", val);
    });
    guiSelection.add(guiOptions.selection, 'center').name("center").listen().onFinishChange((val) => {
        selectionUpdate("center", val);
    });
    guiSelection.add(guiOptions.selection, 'clone').name("Clone");
    guiSelection.add(guiOptions.selection, 'export').name("Export");
    guiSelection.add(guiOptions.selection, 'import').name("Import");
    guiSelection.add(guiOptions.selection, 'clear').name("Clear");
    guiSelection.add(guiOptions.selection, 'delete').name("Delete");

    guiCreate.add(guiOptions.create, "mass");
    guiCreate.add(guiOptions.create, "charge");
    guiCreate.add(guiOptions.create, "nearCharge");
    guiCreate.add(guiOptions.create, "velocity");
    guiCreate.add(guiOptions.create, "radius");
    guiCreate.add(guiOptions.create, "quantity");
    guiCreate.add(guiOptions.create, "create").name("Generate");

    //gui.close();
}

window.onresize = () => {
    graphics.onWindowResize(window);
};

document.addEventListener("keydown", (event) => {
    if (mouseOverGUI) return;

    let key = event.key.toLowerCase();
    console.log(key);
    switch (key) {
        case ' ':
            guiOptions.controls.pauseResume();
            break;

        case 'c':
            guiOptions.controls.resetCamera();
            break;

        case 'r':
            guiOptions.controls.reset();
            break;

        case 'p':
            guiOptions.controls.snapshot();
            break;

        case 'd':
            console.log(simulationExportCsv());
            break;

        case 'a':
            guiOptions.controls.hideAxis();
            break;

        case 'v':
            guiOptions.controls.xyCamera();
            break;

        case 'n':
            guiOptions.controls.step();
            break;

        case 'q':
            guiOptions.controls.colorMode();
            break;

        case 'pagedown':
            guiOptions.controls.next();
            break;

        case 'pageup':
            guiOptions.controls.previous();
            break;

        case 'home':
            guiOptions.controls.home();
            break;

        case 'f':
            simulation.fieldSetup("update");
            break;

        case 'h':
            let visibility = stats.dom.style.visibility;
            if (visibility != "hidden")
                stats.dom.style.visibility = "hidden";
            else
                stats.dom.style.visibility = "visible";
            break;

        case 'z':
            if (!mouseOverGUI && selection.list != undefined) {
                if (selection.list.length == 0) return;
                let center = cameraToWorldCoord(mousePosition, graphics.camera, 0);
                if (simulation.mode2D) {
                    center.z = 0;
                }
                simulationCreateParticles(selection.list, center);
            }
            break;

        default:
            break;

    }
});

window.addEventListener('pointermove', function (event) {
    mousePosition = mouseToScreenCoord(event);
    if (selection.started) {
        selection.update(event);
    }
});

document.addEventListener("pointerdown", (event) => {
    if (event.button == 0 && event.shiftKey) {
        selection = new SelectionHelper(graphics, guiOptions.selection, guiSelection);
        selection.start(event);
    }
});

document.addEventListener("pointerup", (event) => {
    if (event.button == 0 && selection.started) {
        selection.end(event);
    } else if (event.button == 0 && !mouseOverGUI) {
        let particle = graphics.raycast(mousePosition);
        if (particle) {
            guiOptions.particle.obj = particle;
            guiParticle.open();
        }
    }
});

function updateInfoView(now) {
    let [name, n, t, e, c, m, r, totalTime, totalCharge] = simulation.state();
    guiOptions.info.name = name;
    guiOptions.info.particles = n;
    let realTime = new Date(totalTime).toISOString().substring(11, 19);
    guiOptions.info.time = realTime + " (" + t + ")";
    guiOptions.info.energy = (e / n).toExponential(2) + " / " + Math.sqrt(e / m).toExponential(2);
    guiOptions.info.collisions = c;
    guiOptions.info.mass = m.toExponential(2);
    guiOptions.info.radius = r.toExponential(2);
    guiOptions.info.charge = totalCharge.toExponential(2);
    guiOptions.info.cameraDistance = graphics.controls.getDistance().toExponential(2);
    guiOptions.info.mode = simulation.mode2D ? "2D" : "3D";
}

function updateParticleView() {
    let particleView = guiOptions.particle;
    let particle = particleView.obj;

    if (particle) {
        if (useGPU) graphics.readbackParticleData(particle);

        //static info
        particleView.id = particle.id;
        particleView.mass = particle.mass.toExponential(3);
        particleView.charge = particle.charge.toExponential(3);
        particleView.nearCharge = particle.nearCharge;

        let color = particle.color;
        if (particle.mesh) {
            color = particle.mesh.material.color;
        }
        particleView.color = "#" + color.getHexString();//arrayToString(color.toArray(), 2);

        //dynamic info
        let position = [];
        particle.position.toArray().forEach(element => {
            position.push(element.toExponential(3));
        });
        particleView.position = position;
        particleView.velocityDir = arrayToString(
            particle.velocity.clone().normalize().toArray(), 3);
        particleView.velocityAbs = particle.velocity.length().toExponential(3);

        // field info
        let probe = new Particle();
        probe.charge = 1;
        probe.mass = 1;
        probe.nearCharge = 1;
        probe.position = particle.position;
        let field = simulation.fieldProbe(probe);
        let fieldAmp = field.length();
        particleView.field.amplitude = fieldAmp.toExponential(3);
        particleView.field.direction = arrayToString(field.normalize().toArray(), 2);
        particleView.energy = particle.energy().toExponential(3);
    }
}

function resetParticleView(clear = true) {
    followParticle = false;
    if (clear) {
        let particleView = guiOptions.particle;
        particleView.obj = undefined;
        particleView.id = "";
        particleView.mass = "";
        particleView.charge = "";
        particleView.nearCharge = "";
        particleView.color = "";
        particleView.position = "";
        particleView.velocityDir = "";
        particleView.velocityAbs = "";
        particleView.field.amplitude = "";
        particleView.field.direction = "";
        particleView.energy = "";
        guiParticle.close();
    }
}

function resetEditView() {
    let edit = guiOptions.parameters;
    edit.massConstant = simulation.physics.massConstant.toExponential(2);
    edit.chargeConstant = simulation.physics.chargeConstant.toExponential(2);
    edit.nearChargeConstant = simulation.physics.nearChargeConstant.toExponential(2);
    edit.nearChargeRange = simulation.physics.nearChargeRange.toExponential(2);
    edit.boundaryDamping = simulation.physics.boundaryDamping;
    edit.boundaryDistance = simulation.physics.boundaryDistance.toExponential(2);
    edit.minDistance2 = simulation.physics.minDistance2;
    edit.forceConstant = simulation.physics.forceConstant;
    edit.radius = simulation.particleRadius;
    edit.radiusRange = simulation.particleRadiusRange;
    edit.maxParticles = graphics.maxParticles;
}

function selectionReset() {
    selection.clear();
    guiSelection.close();
}

function selectionUpdate(param, val) {
    simulationUpdateParticleList(param, val, selection.list);
    selection.updateView();
}

function snapshot() {
    let timestamp = new Date().toISOString();
    let name = simulation.state()[0];
    let finalName = name + "_" + timestamp;
    finalName = finalName.replaceAll(/[ :\/-]/ig, "_").replaceAll(/\.csv/ig, "");
    console.log("snapshot " + finalName);

    graphics.update();
    graphics.renderer.domElement.toBlob((blob) => {
        downloadFile(blob, finalName + ".png", "image/png");
    }, 'image/png', 1);
    downloadFile(simulationExportCsv(), finalName + ".csv", "text/plain;charset=utf-8");
}

export function animate(time) {
    requestAnimationFrame(animate);

    graphics.update();
    stats.update();

    if (followParticle && guiOptions.particle.obj) {
        let x = guiOptions.particle.obj.position;

        graphics.camera.position.set(x.x, x.y, graphics.controls.getDistance());
        graphics.controls.target.set(x.x, x.y, x.z);
        graphics.controls.update();
    }

    if (!pause || nextFrame) {
        nextFrame = false;

        let dt = 0;
        if (!isNaN(time) && lastAnimateTime > 0) {
            dt = time - lastAnimateTime;
        }

        simulation.step(dt);
    }

    if (time - lastViewUpdate >= viewUpdateDelay) {
        lastViewUpdate = time;

        updateParticleView();
        updateInfoView(time);
        selection.updateView();

        if (updateField) {
            updateField = false;
            simulation.fieldSetup("update");
        }
    }

    if (!isNaN(time)) lastAnimateTime = time;
}