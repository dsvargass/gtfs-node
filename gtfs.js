const fs = require('fs');
const csv = require('csv-parser');
const DEFAULT_PATH = "./arquivo-gtfs";
const COLOR_CYAN = "\x1b[36m%s\x1b[0m";

const importAgency = async (db) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const collection = db.collection('agency');

        fs.createReadStream(`${DEFAULT_PATH}/agency.txt`)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    await collection.insertMany(results);
                    console.log(COLOR_CYAN, 'Agency imported successfully');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
    });
}

const importStops = async (db) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const collection = db.collection('stops');

        fs.createReadStream(`${DEFAULT_PATH}/stops.txt`)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    await collection.insertMany(results);
                    console.log(COLOR_CYAN, 'Stops imported successfully');

                    //Cria um campo location que depois será utilizado para buscar uma parada a partir de um ponto geográfico.
                    await collection.find({}).forEach(doc => {
                        collection.updateOne(
                            { _id: doc._id },
                            {
                                $set: {
                                    location: {
                                        type: "Point",
                                        coordinates: [parseFloat(doc.stop_lon), parseFloat(doc.stop_lat)]
                                    }
                                }
                            }
                        );
                    });

                    //Cria o índice para location.
                    await collection.createIndex({ location: "2dsphere" });
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
    });
}

const importStopTimes = async (db) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const collection = db.collection('stop_times');

        fs.createReadStream(`${DEFAULT_PATH}/stop_times.txt`)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    await collection.insertMany(results);
                    console.log(COLOR_CYAN, 'Stop Times imported successfully');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
    });
}

const importRoutes = async (db) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const collection = db.collection('routes');

        fs.createReadStream(`${DEFAULT_PATH}/routes.txt`)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    await collection.insertMany(results);
                    console.log(COLOR_CYAN, 'Routes imported successfully');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
    });
}

const importTrips = async (db) => {
    return new Promise((resolve, reject) => {
        const results = [];
        const collection = db.collection('trips');

        fs.createReadStream(`${DEFAULT_PATH}/trips.txt`)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    await collection.insertMany(results);
                    console.log(COLOR_CYAN, 'Trips imported successfully');
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
    });
}

module.exports = {
    importAgency,
    importRoutes,
    importStops,
    importStopTimes,
    importTrips
}