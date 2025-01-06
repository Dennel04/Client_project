const mysql = require('mysql2');
const dotenv = require('dotenv');
const ping = require('ping');

const dbHost = 'd26893.mysql.zonevs.eu';

ping.sys.probe(dbHost, (isAlive) => {
    if (isAlive) {
        console.log(`${dbHost} is reachable.`);
    } else {
        console.log(`${dbHost} is not reachable.`);
    }
});

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 3306,
    ssl: false,      
    connectTimeout: 60000, 
    waitForConnections: true,
    connectionLimit: 5
});

// Добавляем логирование для отладки
pool.on('connection', function (connection) {
    console.log('DB Connection established');
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Detailed connection error:', err);
        return;
    }
    console.log('Successfully connected to database');
    connection.release();
});

module.exports = pool;