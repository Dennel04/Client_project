const mysql = require('mysql');
const dotenv = require('dotenv');
console.log("DB Host:", process.env.DB_HOST);
console.log("DB User:", process.env.DB_USER);

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
});

module.exports = pool;
