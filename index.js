const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const {
    moveToBounty,
    findOptimalBounty,
    selectEnemyForAttack,
    calculateAnomalyInfluence,
    avoidAnomalies,
    gatherCoinsOnPath
} = require('./mechanics/calculateGoldVector.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 1488;

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

wss.on('connection', (ws) => {
    console.log('New client connected');
    ws.send(JSON.stringify({ message: 'Welcome to the server!' }));
});

let data = null;

// Определение размера карты
const mapSize = {
    width: 8000,  // Ширина карты
    height: 8000  // Высота карты
};

// Функция для первоначального запроса данных
const fetchInitialData = async () => {
    try {
        const response = await axios.post(
            'https://games-test.datsteam.dev/play/magcarp/player/move',
            { transports: [] },
            { headers: { 'X-Auth-Token': '67091e754514f67091e7545153' } }
        );
        data = response.data;

        // Рассылаем данные всем подключенным клиентам
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    } catch (error) {
        console.error('Error fetching initial data:', error);
    }
};

const updateInterval = 333; // Ограничение 3 запроса в секунду

// Обновляем данные и рассылаем клиентам
const fetchDataAndBroadcast = async () => {
    try {
        if (!data) {
            console.log('Data is not available, exiting function');
            return;
        }

        const bounties = data.bounties;
        const anomalies = data.anomalies;
        const enemies = data.enemies;
        const deltaTime = 0.35;
        const maxAccel = data.maxAccel || 10;

        let importantEventOccurred = false; // Флаг важных событий

        // Массив для хранения всех обновлений для транспорта
        const transportsData = await Promise.all(data.transports.map(async (transport) => {
            avoidAnomalies(transport, anomalies); // Логика избегания аномалий
            const optimalBounty = findOptimalBounty(transport, bounties, anomalies);
            gatherCoinsOnPath(transport, bounties); // Собираем монеты по пути
            const enemyToAttack = selectEnemyForAttack(transport, enemies);

            let transportData = {
                id: transport.id,
                acceleration: { x: 0, y: 0 },
                activateShield: false,
                attack: { x: 0, y: 0 }
            };

            if (enemyToAttack) {
                const attackVector = calculateAttackVector(transport, enemyToAttack);
                transportData.attack = attackVector;
                transportData.activateShield = true; 
                importantEventOccurred = true;
            } else {
                const updatedTransport = await moveToBounty(transport, optimalBounty, maxAccel, deltaTime, anomalies, mapSize);
                transportData.acceleration = updatedTransport.acceleration;
            }

            return transportData;
        }));

        // Отправляем все обновления за один запрос
        const response = await axios.post(
            'https://games-test.datsteam.dev/play/magcarp/player/move',
            { transports: transportsData },
            { headers: { 'X-Auth-Token': '67091e754514f67091e7545153' } }
        );

        data = response.data;

        // Рассылаем данные всем подключенным клиентам
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    } catch (error) {
        console.error('Error fetching data:', error);
    }
};

// Инициализируем данные и только затем запускаем интервал с 333ms
const startFetchingData = async () => {
    await fetchInitialData();
    setInterval(() => fetchDataAndBroadcast(), updateInterval);
};

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startFetchingData();
});