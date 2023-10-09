const { MongoClient } = require('mongodb');
const COLOR_GREEN = "\x1b[32m%s\x1b[0m";
let client = null;
const connect = async () => {
    // Connection URL
    const userDB = "emv";
    const passDB = "emv%40mongodb123%25%25!"
    const ipDB = "db.emvtech.com.br";
    const port = "27017";
    const url = `mongodb://${userDB}:${passDB}@${ipDB}:${port}/?authMechanism=DEFAULT`;
    client = new MongoClient(url);
    // Database Name
    const dbName = 'atividade-avaliativa';
    await client.connect();
    const db = client.db(dbName);
    console.log(COLOR_GREEN, 'Connected successfully to MongoDB');

    return db;
}

const closeConnection = () => {
    if (client) {
        client.close();
    }
};

module.exports = {
    connect,
    closeConnection
}