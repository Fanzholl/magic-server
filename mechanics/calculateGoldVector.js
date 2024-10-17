function calculateDistance(x1, y1, x2, y2) {
      return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
  
  // Оптимальный выбор награды с учётом влияния аномалий
  function findOptimalBounty(transport, bounties, anomalies) {
      let optimalBounty = null;
      let bestScore = -Infinity;
  
      bounties.forEach(bounty => {
          const distance = calculateDistance(transport.x, transport.y, bounty.x, bounty.y);
          const anomalyEffect = calculateAnomalyInfluence(transport, anomalies);
          const adjustedDistance = distance + Math.abs(anomalyEffect.x) + Math.abs(anomalyEffect.y);
          const score = bounty.points / adjustedDistance;
  
          if (score > bestScore) {
              bestScore = score;
              optimalBounty = bounty;
          }
      });
  
      return optimalBounty;
  }
  
  // Определение типа аномалии на основе её свойств
  function calculateAnomalyType(anomaly) {
      if (anomaly.strength > 0 && anomaly.velocity.x > 0 && anomaly.velocity.y > 0) {
          return 'attractive'; // Притягивающая аномалия
      } else if (anomaly.strength < 0 && (anomaly.velocity.x < 0 || anomaly.velocity.y < 0)) {
          return 'repulsive'; // Отталкивающая аномалия
      } else {
          return 'neutral'; // Нейтральная аномалия
      }
  }
  
  // Влияние аномалий на транспорт
  function calculateAnomalyInfluence(transport, anomalies) {
      let totalEffect = { x: 0, y: 0 };
  
      anomalies.forEach(anomaly => {
          const distance = calculateDistance(transport.x, transport.y, anomaly.x, anomaly.y);
  
          // Определяем тип аномалии
          const type = calculateAnomalyType(anomaly);
  
          // Если аномалия находится в пределах радиуса действия
          if (distance <= anomaly.effectiveRadius) {
              const influenceFactor = (anomaly.effectiveRadius - distance) / anomaly.effectiveRadius;
  
              switch (type) {
                  case 'attractive':
                      // Притяжение к аномалии
                      totalEffect.x += anomaly.velocity.x * anomaly.strength * influenceFactor;
                      totalEffect.y += anomaly.velocity.y * anomaly.strength * influenceFactor;
                      break;
                  case 'repulsive':
                      // Отталкивание от аномалии
                      totalEffect.x -= anomaly.velocity.x * anomaly.strength * influenceFactor;
                      totalEffect.y -= anomaly.velocity.y * anomaly.strength * influenceFactor;
                      break;
                  case 'neutral':
                      // Нейтральные аномалии могут влиять на направление
                      totalEffect.x += (Math.random() - 0.5) * anomaly.strength * influenceFactor; // Случайное смещение
                      totalEffect.y += (Math.random() - 0.5) * anomaly.strength * influenceFactor; // Случайное смещение
                      break;
                  default:
                      console.warn(`Unknown anomaly type: ${type}`);
              }
          }
      });
  
      return totalEffect;
  }
  
  // Избегание опасных аномалий
  function avoidAnomalies(transport, anomalies) {
      let avoidanceVector = { x: 0, y: 0 };
      let criticalAvoidance = false; // Флаг критического избегания
  
      anomalies.forEach(anomaly => {
          const distance = calculateDistance(transport.x, transport.y, anomaly.x, anomaly.y);
  
          // Проверяем, находится ли аномалия в пределах радиуса действия и является ли она опасной
          if (distance <= anomaly.effectiveRadius && anomaly.strength < 0) {
              const influenceFactor = (anomaly.effectiveRadius - distance) / anomaly.effectiveRadius;
  
              // Вычисляем вектор избегания
              avoidanceVector.x += (transport.x - anomaly.x) * influenceFactor; // Направление от аномалии
              avoidanceVector.y += (transport.y - anomaly.y) * influenceFactor; // Направление от аномалии
  
              if (distance < 50) { // Если слишком близко, то это критическое избегание
                  criticalAvoidance = true;
              }
          }
      });
  
      // Применяем вектор избегания к текущей скорости транспорта
      if (avoidanceVector.x !== 0 || avoidanceVector.y !== 0) {
          // Нормализуем вектор избегания
          const avoidanceDistance = Math.sqrt(avoidanceVector.x ** 2 + avoidanceVector.y ** 2);
          avoidanceVector.x /= avoidanceDistance;
          avoidanceVector.y /= avoidanceDistance;
  
          // Увеличиваем скорость в зависимости от вектора избегания
          transport.velocity.x += avoidanceVector.x * (criticalAvoidance ? 0.8 : 0.5); // Уменьшаем скорость при критическом избегании
          transport.velocity.y += avoidanceVector.y * (criticalAvoidance ? 0.8 : 0.5); // Уменьшаем скорость при критическом избегании
      }
  }
  
  // Рассчитываем номинал монеты в зависимости от координат и текущей минуты
  function calculateCoinValue(x, y, minute) {
      const centerDistance = Math.sqrt(x ** 2 + y ** 2);
      const baseValue = Math.floor(minute / 5) + 1; // Пример расчета базового значения
      const valueMultiplier = Math.floor(centerDistance / 1000) + 1; // Пример расчета множителя в зависимости от расстояния от центра
      return baseValue * valueMultiplier;
  }
  
  // Собираем монеты по пути к основной награде
  function gatherCoinsOnPath(transport, coins, currentMinute) {
      coins.forEach(coin => {
          const distance = calculateDistance(transport.x, transport.y, coin.x, coin.y);
          if (distance <= coin.radius) { // Если ковёр находится в пределах радиуса монеты
              // Считаем её собранной и корректируем путь
              transport.x = coin.x;
              transport.y = coin.y;
              // Увеличиваем счёт
              transport.gold += calculateCoinValue(coin.x, coin.y, currentMinute);
              // Исцеляем ковёр
              transport.health += 10;
              // Удаляем монету из списка
              coins = coins.filter(c => c !== coin);
          }
      });
  }
  
  // Логика атаки врагов
  function shouldAttackEnemy(transport, enemy) {
      // Условия для атаки: враг с низким здоровьем и здоровье ковра достаточно
      const isEnemyWeak = enemy.health < 50; // Враг с низким здоровьем
      const isTransportHealthy = transport.health > enemy.health; // Транспорт должен быть здоровее врага
      const isEnemyAttacking = enemy.isAttacking; // Враг сейчас атакует
  
      // Мы можем атаковать, если враг слаб или он атакует нас
      return (isEnemyWeak && isTransportHealthy) || isEnemyAttacking;
  }
  
  function selectEnemyForAttack(transport, enemies) {
      let closestEnemy = null;
      let minDistance = Infinity;
  
      enemies.forEach(enemy => {
          const distance = calculateDistance(transport.x, transport.y, enemy.x, enemy.y);
          const enemySpeed = Math.sqrt(enemy.velocity.x ** 2 + enemy.velocity.y ** 2);
  
          // Если враг атакует или удовлетворяет условиям атаки
          if (shouldAttackEnemy(transport, enemy) && distance < transport.attackRadius && distance < minDistance && enemySpeed > 0) {
              closestEnemy = enemy;
              minDistance = distance;
          }
      });
  
      return closestEnemy;
  }
  
  // Обработка атаки врага
  function attackEnemy(transport, enemy) {
      if (enemy) {
          const distance = calculateDistance(transport.x, transport.y, enemy.x, enemy.y);
          console.log(`Attacking enemy at distance ${distance}`);
  
          // Активация щита, если здоровье ковра ниже 30%
          if (transport.health < transport.maxHealth * 0.3) {
              transport.activateShield = true; // Активируем щит
              console.log('Shield activated!');
          }
  
          // Наносим урон
          enemy.health -= transport.attackPower;
  
          // Проверяем, был ли враг уничтожен
          if (enemy.health <= 0) {
              console.log(`Enemy defeated!`);
              // Логика для удаления врага из списка
          }
      }
  }
  
  // Проверка достижения края карты
  function checkBoundary(transport, mapSize) {
      if (transport.x < 0 || transport.x > mapSize.x || transport.y < 0 || transport.y > mapSize.y) {
          console.log("Transport has reached the edge of the map!");
          // Уничтожаем транспорт
          transport.health = 0; // Например, убиваем транспорт
      }
  }
  
  // Обновление логики атаки врага
  function updateEnemyStates(enemies) {
      enemies.forEach(enemy => {
          // Добавим логику определения, атакует ли враг
          if (enemy.health > 0) {
              // Пример логики: враг атакует, если находится рядом с ковром
              enemy.isAttacking = calculateDistance(transport.x, transport.y, enemy.x, enemy.y) < enemy.attackRadius;
          } else {
              enemy.isAttacking = false; // Если враг мёртв, он не может атаковать
          }
      });
  }
  
  // Перемещение к награде с учётом аномалий
  async function moveToBounty(transport, bounty, maxAccel, deltaTime, anomalies, mapSize) {
      // 1. Вычисляем направление к цели (бонусной награде)
      const distanceToBounty = calculateDistance(transport.x, transport.y, bounty.x, bounty.y);
      const directionX = (bounty.x - transport.x) / distanceToBounty;
      const directionY = (bounty.y - transport.y) / distanceToBounty;
  
      // 2. Вычисляем ускорение на основе направления и максимального ускорения
      const accelX = directionX * maxAccel;
      const accelY = directionY * maxAccel;
  
      // 3. Обновляем скорость, учитывая текущее ускорение и ускорение от аномалий
      transport.velocity.x += (accelX * deltaTime + transport.selfAcceleration.x);
      transport.velocity.y += (accelY * deltaTime + transport.selfAcceleration.y);
  
      // 4. Учитываем влияние аномалий
      const anomalyInfluence = calculateAnomalyInfluence(transport, anomalies);
      transport.velocity.x += anomalyInfluence.x;
      transport.velocity.y += anomalyInfluence.y;
  
      // 5. Проверка границ карты
      checkBoundary(transport, mapSize);
  
      // 6. Ограничиваем скорость
      const speed = Math.sqrt(transport.velocity.x ** 2 + transport.velocity.y ** 2);
      if (speed > transport.maxSpeed) {
          const speedFactor = transport.maxSpeed / speed;
          transport.velocity.x *= speedFactor;
          transport.velocity.y *= speedFactor;
      }
  
      // 7. Перемещаем транспорт
      transport.x += transport.velocity.x * deltaTime;
      transport.y += transport.velocity.y * deltaTime;
  
      return transport;
  }
  
  module.exports = {
      moveToBounty,
      findOptimalBounty,
      selectEnemyForAttack,
      calculateAnomalyInfluence,
      avoidAnomalies,
      gatherCoinsOnPath,
      calculateDistance,
      attackEnemy,
      checkBoundary,
      updateEnemyStates
  };  