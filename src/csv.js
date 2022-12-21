import { Physics } from "./physics";
import { Particle, ParticleType } from "./particle";

function log(msg) {
    console.log("CSV: " + msg);
}

export function exportCSV(simulation, list) {
    log("simulationCsv");
    let physics = simulation.physics;
    let graphics = simulation.graphics;

    if (list == undefined) {
        list = physics.particleList;
    }

    const csvVersion = "1.2";

    graphics.readbackParticleData();

    let output = "version";
    output += "," + physics.header();
    output += ",cycles";
    output += ",targetX,targetY,targetZ,cameraX,cameraY,cameraZ";
    output += ",particleRadius,particleRadiusRange,mode2D";
    output += ",nuclearPotential,useBoundaryBox,useDistance1";
    output += "\n";

    output += csvVersion;
    output += "," + physics.csv();
    output += "," + simulation.cycles;
    let target = graphics.controls.target;
    output += "," + target.x;
    output += "," + target.y;
    output += "," + target.z;
    let camera = graphics.camera.position;
    output += "," + camera.x;
    output += "," + camera.y;
    output += "," + camera.z;
    output += "," + simulation.particleRadius;
    output += "," + simulation.particleRadiusRange;
    output += "," + simulation.mode2D;
    output += "," + physics.nuclearPotential;
    output += "," + physics.useBoxBoundary;
    output += "," + physics.useDistance1;
    output += "\n";

    output += list[0].header() + "\n";
    list.forEach((p, i) => {
        output += p.csv() + "\n";
    });
    return output;
}

export function parseCsv(simulation, filename, content) {
    let imported = { physics: new Physics() };
    imported.filename = filename;

    let particleDataColumns = 13;
    let simulationDataColumns = 19;

    let lines = content.split("\n");
    let result = lines.every((line, index) => {
        let values = line.split(",");
        switch (index) {
            default:
                // particle data
                if (values[0] == "") {
                    return true;
                }
                if (values.length != particleDataColumns) {
                    log("invalid particle data");
                    log(line);
                    return false;
                }
                let particle = new Particle();
                //particle.id = parseInt(values[0]);
                particle.type = parseFloat(values[1]);
                if (particle.type == ParticleType.probe) {
                    particle.radius = simulation.field.elementSize();
                }
                particle.mass = parseFloat(values[2]);
                particle.charge = parseFloat(values[3]);
                particle.nuclearCharge = parseFloat(values[4]);
                particle.position.x = parseFloat(values[5]);
                particle.position.y = parseFloat(values[6]);
                particle.position.z = parseFloat(values[7]);
                particle.velocity.x = parseFloat(values[8]);
                particle.velocity.y = parseFloat(values[9]);
                particle.velocity.z = parseFloat(values[10]);
                // parseFloat(values[11]); energy
                particle.collisions = parseFloat(values[12]);

                imported.physics.particleList.push(particle);

                break;

            case 0:
                // physics header
                if (values.length < simulationDataColumns) {
                    log("invalid physics header");
                    return false;
                }
                break;

            case 1:
                // physics data
                if (values.length < simulationDataColumns) {
                    log("invalid physics data");
                    return false;
                }
                imported.version = values[0];
                imported.physics.enableColision = (values[1] == "true") ? (true) : (false);
                imported.physics.minDistance2 = parseFloat(values[2]);
                imported.physics.forceConstant = parseFloat(values[3]);
                imported.physics.massConstant = parseFloat(values[4]);
                imported.physics.chargeConstant = parseFloat(values[5]);
                imported.physics.nuclearChargeConstant = parseFloat(values[6]);
                imported.physics.nuclearChargeRange = parseFloat(values[7]);
                imported.physics.boundaryDistance = parseFloat(values[8]);
                imported.physics.boundaryDamping = parseFloat(values[9]);
                imported.cycles = parseFloat(values[10]);
                let target = {
                    x: parseFloat(values[11]),
                    y: parseFloat(values[12]),
                    z: parseFloat(values[13])
                }
                let camera = {
                    x: parseFloat(values[14]),
                    y: parseFloat(values[15]),
                    z: parseFloat(values[16])
                }
                imported.camera = camera;
                imported.target = target;
                imported.particleRadius = parseFloat(values[17]);
                imported.particleRadiusRange = parseFloat(values[18]);
                let version = parseFloat(imported.version);
                if (version >= 1.1)
                    imported.mode2D = (values[19] === "true");
                if (version >= 1.2)
                    imported.physics.nuclearPotential = values[20];
                imported.physics.useBoxBoundary = (values[21] === "true");
                imported.physics.useDistance1 = (values[22] === "true");
                break;

            case 2:
                // particle header
                if (values.length != particleDataColumns) {
                    log("invalid particle data");
                    return false;
                }
                break;
        }
        return true;
    });

    if (!result) {
        log("failed to import CSV");
        alert("Failed to import CSV.")
        return undefined;
    }

    log(imported.physics.particleList.length + " particles loaded!");
    return imported;
}