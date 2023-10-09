const { rejects } = require("assert");
const { connect, closeConnection } = require("./datasource");
const { importAgency, importRoutes, importStops, importStopTimes, importTrips } = require("./gtfs");
const readline = require('readline');
const COLOR_CYAN = "\x1b[36m%s\x1b[0m";
const COLOR_RED = "\x1b[31m%s\x1b[0m";
const COLOR_GREEN = "\x1b[32m%s\x1b[0m";
const COLOR_YELLOW = "\x1b[33m%s\x1b[0m";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'my-shell> '
});

const displayOptions = () => {
    console.log(`
    Please select an option:
    1. Importar banco de dados GTFS
    2. Listar paradas de ônibus
    3. Buscar parada mais próxima
    4. Exit
  `);
    rl.prompt();
};

const importDatabase = () => {
    return new Promise(async resolve => {
        try {
            const db = await connect();
            await db.dropDatabase(); // Drops the entire database.
            console.log(COLOR_CYAN, "Database is importing...");
            await importAgency(db);
            await importStops(db);
            await importRoutes(db);
            console.log(COLOR_CYAN, "Importando stop_times, isso pode demorar um pouco. Aguarde...");
            await importStopTimes(db);
            await importTrips(db);

            console.log(COLOR_GREEN, "Database imported successfully!");
            DATABASE_STATUS = "Imported";
            resolve();
        } catch (err) {
            console.log(COLOR_RED, err.message);
            rejects(err);
        } finally {
            displayOptions();
            closeConnection();
        }
    });
};

const promptStops = () => {
    rl.question('Digite o nome da linha do ônibus: ', async (answer) => {
        try {
            const db = await connect();
            const routeName = new RegExp(answer, 'i');
            console.log(COLOR_GREEN, `Buscando paradas da linha: ${answer} ...`);
            // 1. Busca o route_id através do nome da linha
            const route = await db.collection('routes').findOne({ route_short_name: routeName });
            if (route) {
                const routeId = route.route_id;
                // 2. Busca todos os trip_id associados a essa rota
                const trips = await db.collection('trips').find({ route_id: routeId }).toArray();
                const tripIds = trips.map(trip => trip.trip_id);
                // 3. Busca no stop_times todos os stop_id associados a essas viagens
                const stopTimes = await db.collection('stop_times').find({ trip_id: { $in: tripIds } }).toArray();
                const stopIds = [...new Set(stopTimes.map(stopTime => stopTime.stop_id))];
                // 4. Utiliza o stop_id para encontrar detalhes sobre cada parada
                const stops = await db.collection('stops').find({ stop_id: { $in: stopIds } }).toArray();
                console.table(stops);
            } else {
                console.log(COLOR_YELLOW, "Linha de ônibus não encontrada");
            }
        } catch (err) {
            console.log(COLOR_RED, err.message);
        } finally {
            closeConnection();
            displayOptions();
        }
    });
};

const getNearestStop = async () => {
    let busLineName = '';
    let userLocation = { lat: null, lon: null };

    const askBusLineName = () => {
        return new Promise((resolve) => {
            rl.question('Digite o nome da linha do ônibus: ', (answer) => {
                busLineName = answer;
                resolve();
            });
        });
    };

    const askUserLocationLat = () => {
        return new Promise((resolve) => {
            rl.question('Digite sua latitude: ', (lat) => {
                userLocation.lat = parseFloat(lat);
                resolve();
            });
        });
    };

    const askUserLocationLon = () => {
        return new Promise((resolve) => {
            rl.question('Digite sua longitude: ', (lon) => {
                userLocation.lon = parseFloat(lon);
                resolve();
            });
        });
    };

    const runQuestions = async () => {
        await askBusLineName();
        await askUserLocationLat();
        await askUserLocationLon();

        try {
            const db = await connect();

            // Busca o ID da rota com o nome da linha
            const routeCollection = db.collection('routes');
            const route = await routeCollection.findOne({ route_short_name: new RegExp(busLineName, 'i') });
            if (!route) {
                console.log(COLOR_RED, "Linha de ônibus não encontrada.");
                return;
            }

            // Busca os trip_ids associados a esse route_id
            const tripsCollection = db.collection('trips');
            const trips = await tripsCollection.find({ route_id: route.route_id }).toArray();

            if (!trips.length) {
                console.log(COLOR_RED, "Nenhuma viagem encontrada para esta linha.");
                return;
            }
            const tripIds = trips.map(trip => trip.trip_id);

            // Busca os stop_ids usando os trip_ids
            const stopTimesCollection = db.collection('stop_times');
            const stopTimes = await stopTimesCollection.find({ trip_id: { $in: tripIds } }).toArray();

            if (!stopTimes.length) {
                console.log(COLOR_RED, "Nenhuma parada encontrada para estas viagens.");
                return;
            }
            const stopIds = stopTimes.map(stopTime => stopTime.stop_id);

            // Finalmente, usa os stop_ids para buscar a parada mais próxima
            const stopsCollection = db.collection('stops');
            if (isNaN(userLocation.lat) || isNaN(userLocation.lon)) {
                console.log(COLOR_RED, "Por favor, insira coordenadas válidas.");
                return;
            }
            const result = await stopsCollection.find({
                stop_id: { $in: stopIds },
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [userLocation.lon, userLocation.lat]
                        }
                    }
                }
            }).limit(1).toArray();
            if (result && result.length > 0) {
                console.table(result[0]);
            } else {
                console.log(COLOR_RED, "Nenhuma parada encontrada para esta linha perto da sua localização.");
            }
        } catch (err) {
            console.error(err);
            return null;
        } finally {
            closeConnection();
            displayOptions();
        }
    };

    runQuestions();
};

displayOptions();

rl.on('line', (line) => {
    switch (line.trim()) {
        case '1':
            importDatabase();
            break;
        case '2':
            promptStops();
            break;
        case '3':
            getNearestStop();
            break;
        case '4':
            rl.close();
            break;
        default:
            console.log(COLOR_RED, `Invalid option. Please try again.`);
            displayOptions();
            break;
    }
}).on('close', () => {
    console.log('Have a great day!');
    process.exit(0);
});
