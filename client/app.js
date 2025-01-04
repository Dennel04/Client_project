document.addEventListener('DOMContentLoaded', function() {
    const regionInput = document.getElementById('region');
    const regionDropdown = document.getElementById('regionDropdown');
    const stopSearchInput = document.getElementById('stopSearch');
    const stopsDropdown = document.getElementById('stopsDropdown');
    const stopSearchContainer = document.getElementById('stopSearchContainer');
    const fetchStopsButton = document.getElementById('fetchStops');
    const backButton = document.getElementById('backButton');
    const busesContainer = document.getElementById('buses');
    const geoButton = document.getElementById('geoButton');
    const nearestStopInfo = document.getElementById('nearestStopInfo');
    const viewNearestRoutesButton = document.getElementById('viewNearestRoutes');

    if (viewNearestRoutesButton) {
        viewNearestRoutesButton.addEventListener('click', function() {
            loadBuses(window.nearestStopId);
            nearestStopInfo.style.display = 'none';
        });
    }
   
    // Вставляем после кнопки геолокации
    if (geoButton) {
        geoButton.parentNode.insertBefore(nearestStopInfo, geoButton.nextSibling);
        
        // Добавляем обработчик для кнопки просмотра маршрутов
        document.getElementById('viewNearestRoutes').addEventListener('click', function() {
            loadBuses(window.nearestStopId);
            nearestStopInfo.style.display = 'none';
        });
    }

    let allStops = [];
    let selectedStopId = null;

    function getGeolocation() {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const { latitude, longitude } = position.coords;
                    findNearestStop(latitude, longitude);
                },
                error => {
                    console.error("Ошибка получения геолокации:", error);
                    alert("Не удалось определить ваше местоположение.");
                }
            );
        } else {
            alert("Ваш браузер не поддерживает геолокацию.");
        }
    }

    // Функция сортировки автобусных номеров
    function compareBusNumbers(a, b) {
        // Разделяем номер на числовую и буквенную части
        const splitNumber = (str) => {
            const match = str.match(/^(\d+)([A-Za-z]*)$/);
            return match ? [parseInt(match[1]), match[2]] : [0, str];
        };

        const [numA, letterA] = splitNumber(a.short_name);
        const [numB, letterB] = splitNumber(b.short_name);

        // Сначала сравниваем числа
        if (numA !== numB) {
            return numA - numB;
        }
        // При равных числах сравниваем буквы
        return letterA.localeCompare(letterB);
    }

    function loadRegions() {
        fetch('/regions')
            .then(response => response.json())
            .then(data => {
                window.regions = data;
                updateRegionDropdown('');
            })
            .catch(err => {
                console.error('Ошибка при загрузке регионов:', err);
            });
    }

    function updateRegionDropdown(query) {
        const filteredRegions = window.regions.filter(region =>
            region.region_name.toLowerCase().includes(query.toLowerCase())
        );

        regionDropdown.innerHTML = '';
        
        filteredRegions.forEach(region => {
            const item = document.createElement('li');
            item.className = 'dropdown-item';
            item.textContent = region.region_name;
            item.addEventListener('click', () => {
                regionInput.value = region.region_name;
                regionDropdown.classList.remove('show');
            });
            regionDropdown.appendChild(item);
        });

        if (filteredRegions.length > 0) {
            regionDropdown.classList.add('show');
        } else {
            regionDropdown.classList.remove('show');
        }
    }

    function updateStopsDropdown(query) {
        const filteredStops = allStops.filter(stop =>
            stop.stop_name.toLowerCase().includes(query.toLowerCase())
        );

        stopsDropdown.innerHTML = '';

        filteredStops.forEach(stop => {
            const item = document.createElement('li');
            item.className = 'dropdown-item';
            item.textContent = stop.stop_name;
            item.addEventListener('click', () => {
                stopSearchInput.value = stop.stop_name;
                stopsDropdown.classList.remove('show');
                loadBuses(stop.stop_id);
            });
            stopsDropdown.appendChild(item);
        });

        if (filteredStops.length > 0) {
            stopsDropdown.classList.add('show');
        } else {
            stopsDropdown.classList.remove('show');
        }
    }

    function formatTime(timeString) {
        return timeString.substring(0, 5); // Обрезаем секунды, оставляем только HH:MM
    }

    function loadBusSchedule(stopId, routeId, routeName) {
        busesContainer.innerHTML = 'Загрузка расписания...';
        backButton.style.display = 'block';

        fetch(`/schedule?stop_id=${encodeURIComponent(stopId)}&route_id=${encodeURIComponent(routeId)}`)
            .then(response => response.json())
            .then(schedule => {
                busesContainer.innerHTML = '';
                
                // Добавляем заголовок с номером маршрута
                const routeHeader = document.createElement('h3');
                routeHeader.textContent = `Расписание маршрута ${routeName}`;
                busesContainer.appendChild(routeHeader);

                if (schedule.length === 0) {
                    busesContainer.appendChild(document.createTextNode('Нет доступных рейсов в ближайшее время.'));
                    return;
                }

                const table = document.createElement('table');
                table.className = 'table table-striped';
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Время прибытия</th>
                            <th>Направление</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${schedule.map(time => `
                            <tr>
                                <td>${formatTime(time.arrival_time)}</td>
                                <td>${time.direction || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                `;
                
                busesContainer.appendChild(table);
            })
            .catch(err => {
                console.error('Ошибка при загрузке расписания:', err);
                busesContainer.textContent = 'Ошибка при загрузке расписания.';
            });
    }

    function findNearestStop(lat, lon) {
        console.log('Поиск ближайшей остановки для координат:', lat, lon);
        
        fetch(`/nearest-stop?lat=${lat}&lon=${lon}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Ошибка сети: ' + response.status);
                }
                return response.json();
            })
            .then(data => {
                console.log('Получены данные о ближайшей остановке:', data);
                window.nearestStopId = data.stop_id;
                regionInput.value = data.stop_area;
                
                // Показываем информацию о ближайшей остановке
                document.getElementById('nearestStopName').textContent = data.stop_name;
                nearestStopInfo.style.display = 'block';
                
                // Скрываем контейнер с автобусами и поиском
                busesContainer.style.display = 'none';
                stopSearchContainer.style.display = 'none';
                
                // Загружаем остановки для этого региона в фоне
                return fetch(`/stops?region=${encodeURIComponent(data.stop_area)}`);
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Ошибка при загрузке остановок');
                }
                return response.json();
            })
            .then(stops => {
                allStops = stops;
                stopSearchInput.value = ''; // Очищаем поле поиска
            })
            .catch(err => {
                console.error('Ошибка:', err);
                alert('Произошла ошибка: ' + err.message);
            });
    }

    function loadBuses(stopId) {
        selectedStopId = stopId;
        showBusesList();
        busesContainer.innerHTML = 'Загрузка маршрутов...';
        nearestStopInfo.style.display = 'none'; // Скрываем информацию о ближайшей остановке

        fetch(`/buses?stop_id=${encodeURIComponent(stopId)}`)
            .then(response => response.json())
            .then(buses => {
                busesContainer.innerHTML = '';
                if (buses.length === 0) {
                    busesContainer.textContent = 'Нет доступных автобусов.';
                    return;
                }

                // Сортируем автобусы
                buses.sort(compareBusNumbers);

                buses.forEach(bus => {
                    const busButton = document.createElement('button');
                    busButton.className = 'bus-button';
                    busButton.textContent = `${bus.short_name} - ${bus.long_name}`;
                    
                    busButton.addEventListener('click', () => {
                        loadBusSchedule(stopId, bus.route_id, bus.short_name);
                    });
                    
                    busesContainer.appendChild(busButton);
                });
            })
            .catch(err => {
                console.error('Ошибка при загрузке автобусов:', err);
                busesContainer.textContent = 'Ошибка при загрузке маршрутов.';
            });
    }

    function showStopsList() {
        stopSearchContainer.style.display = 'block';
        busesContainer.style.display = 'none';
        backButton.style.display = 'none';
        stopSearchInput.value = '';
        stopsDropdown.classList.remove('show');
    }

    function showBusesList() {
        stopSearchContainer.style.display = 'none';
        busesContainer.style.display = 'block';
        backButton.style.display = 'block';
    }

    // Event listeners
    if (geoButton) {
        geoButton.addEventListener('click', getGeolocation);
    }

    regionInput.addEventListener('input', function() {
        const query = regionInput.value.trim();
        updateRegionDropdown(query);
    });

    regionInput.addEventListener('focus', function() {
        if (window.regions) {
            updateRegionDropdown(regionInput.value.trim());
        }
    });

    stopSearchInput.addEventListener('input', function() {
        const query = stopSearchInput.value.trim();
        updateStopsDropdown(query);
    });

    stopSearchInput.addEventListener('focus', function() {
        updateStopsDropdown(stopSearchInput.value.trim());
    });

    document.addEventListener('click', function(e) {
        if (!regionInput.contains(e.target) && !regionDropdown.contains(e.target)) {
            regionDropdown.classList.remove('show');
        }
        if (!stopSearchInput.contains(e.target) && !stopsDropdown.contains(e.target)) {
            stopsDropdown.classList.remove('show');
        }
    });

    backButton.addEventListener('click', showStopsList);

    fetchStopsButton.addEventListener('click', function() {
        const selectedRegion = regionInput.value;
        if (!selectedRegion) {
            alert('Пожалуйста, выберите регион!');
            return;
        }

        fetch(`/stops?region=${encodeURIComponent(selectedRegion)}`)
            .then(response => response.json())
            .then(data => {
                allStops = data;
                showStopsList();
            })
            .catch(err => {
                console.error('Ошибка при загрузке остановок:', err);
                stopSearchContainer.textContent = 'Ошибка при загрузке остановок.';
            });
    });

    loadRegions();
});