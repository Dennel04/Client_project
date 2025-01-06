require('dotenv').config(); // Для загрузки переменных окружения из .env файла
const express = require('express');
const path = require('path');
const pool = require('./db');
const app = express();


app.use(express.json());

// Обслуживание статических файлов из папки client
app.use(express.static(path.join(__dirname, '../client')));


// API маршруты

// Получаем все регионы (из столбца stop_area)
app.get('/regions', (req, res) => {
    pool.query('SELECT DISTINCT stop_area AS region_name FROM stops', (err, results) => {
        if (err) {
            console.error("Ошибка при запросе регионов:", err);
            return res.status(500).send("Ошибка при запросе регионов.");
        }
        // Отправляем данные в формате JSON
        res.json(results.map(row => ({ region_name: row.region_name })));
    });
});

app.get('/stops', (req, res) => {
    const { region } = req.query;

    pool.query(
        'SELECT stop_id, stop_name FROM stops WHERE stop_area = ? ORDER BY stop_name ASC',
        [region],
        (err, results) => {
            if (err) {
                console.error("Ошибка при запросе остановок:", err);
                return res.status(500).send("Ошибка при запросе остановок.");
            }

            const uniqueStops = {};

            results.forEach(row => {
                const stopName = row.stop_name.trim().toLowerCase();
                if (!uniqueStops[stopName]) {
                    uniqueStops[stopName] = row.stop_id;
                }
            });

            const stops = Object.keys(uniqueStops).map(stopName => ({
                stop_id: uniqueStops[stopName],
                stop_name: stopName.charAt(0).toUpperCase() + stopName.slice(1)
            }));

            res.json(stops);
        }
    );
});





app.get('/buses', (req, res) => {
    const { stop_id } = req.query;

    console.log("Запрос на автобусы для остановки с ID:", stop_id);

    if (!stop_id) {
        console.log("Ошибка: Не указан идентификатор остановки.");
        return res.status(400).send("Не указан идентификатор остановки.");
    }

    const query = `
        SELECT DISTINCT 
            r.route_short_name, 
            r.route_long_name
        FROM 
            stops s
        JOIN 
            stop_times st ON s.stop_id = st.stop_id
        JOIN 
            trips t ON st.trip_id = t.trip_id
        JOIN 
            routes r ON t.route_id = r.route_id
        WHERE 
            s.stop_id = ?
        ORDER BY 
            r.route_short_name ASC
    `;

    pool.query(query, [stop_id], (err, results) => {
        if (err) {
            console.error("Ошибка при запросе автобусов:", err);
            return res.status(500).send("Ошибка при запросе автобусов.");
        }

        console.log("Найдено автобусов:", results.length);

        if (results.length === 0) {
            console.log(`Найдено 0 автобусов для остановки с ID: ${stop_id}`);
        }

        // Форматируем результат для клиента
        res.json(results.map(row => ({
            short_name: row.route_short_name,
            long_name: row.route_long_name,
        })));
    });
});

app.get('/schedule', (req, res) => {
    const { stop_id, route_id } = req.query;
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}:00`;

    const query = `
        SELECT DISTINCT 
            st.arrival_time,
            r.route_short_name,
            r.route_long_name,
            t.trip_headsign,
            t.direction_code
        FROM 
            stop_times st
            JOIN trips t ON st.trip_id = t.trip_id
            JOIN routes r ON t.route_id = r.route_id
        WHERE 
            st.stop_id = ?
            AND st.arrival_time >= ?
        ORDER BY 
            st.arrival_time ASC
        LIMIT 5
    `;

    pool.query(query, [stop_id, currentTimeString], (err, results) => {
        if (err) {
            console.error("Ошибка при запросе расписания:", err);
            return res.status(500).send("Ошибка при запросе расписания.");
        }

        const schedule = results.map(row => ({
            arrival_time: row.arrival_time,
            route_number: row.route_short_name,
            route_name: row.route_long_name,
            direction: row.trip_headsign,
            direction_code: row.direction_code
        }));

        res.json(schedule);
    });
});

app.get('/nearest-stop', (req, res) => {
    const { lat, lon } = req.query;
    // Используем формулу расчета расстояния между точками (Haversine formula)
    const query = `
        SELECT 
            stop_id,
            stop_name,
            stop_area,
            stop_lat,
            stop_lon,
            (6371 * acos(
                cos(radians(?)) * cos(radians(stop_lat)) *
                cos(radians(stop_lon) - radians(?)) +
                sin(radians(?)) * sin(radians(stop_lat))
            )) AS distance
        FROM 
            stops
        WHERE 
            stop_lat IS NOT NULL 
            AND stop_lon IS NOT NULL
        ORDER BY 
            distance ASC
        LIMIT 1
    `;

    pool.query(query, [lat, lon, lat], (err, results) => {
        console.log("try");
        if (err) {
            console.error("Ошибка при поиске ближайшей остановки:", err);
            return res.status(500).send("Ошибка при поиске ближайшей остановки.");
        }

        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).send("Остановки не найдены.");
        }
    });
});

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client', 'index.html'));

});

// Запуск сервера
app.listen(3000, () => {
    console.log('Server running on port 3000');
});


