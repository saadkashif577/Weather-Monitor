const locations = [
  { name: "Islamabad", latitude: 33.6844, longitude: 73.0479 },
  { name: "Lahore", latitude: 31.5204, longitude: 74.3587 },
  { name: "Karachi", latitude: 24.8607, longitude: 67.0011 },
  { name: "Quetta", latitude: 30.1798, longitude: 66.9750 },
  { name: "Peshawar", latitude: 34.0151, longitude: 71.5249 }
];

const conditions = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle",
  55: "Dense drizzle", 56: "Freezing drizzle", 57: "Dense freezing drizzle",
  61: "Slight rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain",
  67: "Heavy freezing rain", 71: "Slight snow", 73: "Snow", 75: "Heavy snow",
  77: "Snow grains", 80: "Rain showers", 81: "Moderate showers",
  82: "Heavy showers", 85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail"
};

const map = L.map("map").setView([30.7, 69.5], 5);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const markers = L.layerGroup().addTo(map);
const searchInput = document.querySelector("#city-search");
const cityCards = document.querySelector("#city-cards");
const statusMessage = document.querySelector("#status");
let weatherLocations = [];

function conditionName(code) {
  return conditions[code] || "Unknown conditions";
}

function filteredLocations() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  return weatherLocations.filter((location) => location.name.toLocaleLowerCase().includes(query));
}

function renderLocations() {
  const matches = filteredLocations();
  cityCards.replaceChildren();
  markers.clearLayers();

  for (const location of matches) {
    const marker = L.circleMarker([location.latitude, location.longitude], {
      radius: 8,
      color: "#fff",
      weight: 2,
      fillColor: "#34749a",
      fillOpacity: 0.95
    }).bindPopup(
      `<strong>${location.name}</strong><br>${location.current.temperature_2m} °C<br>${conditionName(location.current.weather_code)}<br>Humidity: ${location.current.relative_humidity_2m}%`
    ).addTo(markers);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "city-button";
    const name = document.createElement("span");
    name.className = "city-name";
    name.textContent = location.name;
    const temperature = document.createElement("strong");
    temperature.className = "city-temperature";
    temperature.textContent = `${location.current.temperature_2m} °C`;
    const condition = document.createElement("span");
    condition.className = "city-condition";
    condition.textContent = conditionName(location.current.weather_code);
    const humidity = document.createElement("span");
    humidity.className = "city-humidity";
    humidity.textContent = `Humidity ${location.current.relative_humidity_2m}%`;
    button.append(name, temperature, condition, humidity);
    button.addEventListener("click", () => {
      map.flyTo([location.latitude, location.longitude], 8);
      marker.openPopup();
    });
    cityCards.append(button);
  }

  if (weatherLocations.length && matches.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-result";
    emptyMessage.textContent = "No matching cities.";
    cityCards.append(emptyMessage);
  }
}

async function loadWeather() {
  statusMessage.textContent = "Loading weather data…";
  statusMessage.classList.remove("error");

  const parameters = new URLSearchParams({
    latitude: locations.map(({ latitude }) => latitude).join(","),
    longitude: locations.map(({ longitude }) => longitude).join(","),
    current: "temperature_2m,relative_humidity_2m,weather_code",
    timezone: "Asia/Karachi"
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${parameters}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) {
      throw new Error(`Open-Meteo returned HTTP ${response.status}.`);
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length !== locations.length ||
        data.some((entry) => !entry.current || typeof entry.current.temperature_2m !== "number" ||
          typeof entry.current.weather_code !== "number")) {
      throw new Error("The API returned incomplete weather data.");
    }

    weatherLocations = locations.map((location, index) => ({
      ...location,
      current: data[index].current
    }));
    statusMessage.textContent = "Select a city or marker to view current weather.";
    renderLocations();
  } catch (error) {
    statusMessage.textContent = `Could not load weather data: ${error.message} Check your connection and reload.`;
    statusMessage.classList.add("error");
  }
}

searchInput.addEventListener("input", renderLocations);
loadWeather();
