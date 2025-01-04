const mysql = require('mysql');
const dotenv = require('dotenv');

// Важно: dotenv.config() должен быть вызван ДО использования process.env
dotenv.config();

console.log("DB Host:", process.env.DB_HOST);
console.log("DB User:", process.env.DB_USER);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    // Добавляем SSL
    ssl: {
        rejectUnauthorized: false // Это самый простой вариант SSL
    },
    // Дополнительные настройки для улучшения стабильности
    connectTimeout: 20000, // 20 секунд
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Добавляем обработку ошибок пула
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Проверяем подключение при старте
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Successfully connected to database');
    connection.release();
});

module.exports = pool;