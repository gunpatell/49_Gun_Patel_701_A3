const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const descriptions = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
  80: 'Rain showers', 81: 'Rain showers', 82: 'Heavy showers', 95: 'Thunderstorm',
  96: 'Thunderstorm with hail', 99: 'Thunderstorm with hail'
};

async function getWeather(city) {
  const locationResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  if (!locationResponse.ok) throw new Error('Location service unavailable.');
  const locationData = await locationResponse.json();
  const location = locationData.results?.[0];
  if (!location) return null;

  const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
  weatherUrl.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
    timezone: 'auto'
  });
  const weatherResponse = await fetch(weatherUrl);
  if (!weatherResponse.ok) throw new Error('Weather service unavailable.');
  const weather = await weatherResponse.json();

  return {
    location: { name: location.name, country: location.country },
    current: weather.current,
    units: weather.current_units,
    description: descriptions[weather.current.weather_code] || 'Weather update'
  };
}

app.get('/', async (req, res) => {
  const city = String(req.query.city || '').trim();
  if (!city) return res.render('weather', { city: 'Surat', weather: null, error: '' });

  try {
    const weather = await getWeather(city);
    if (!weather) return res.status(404).render('weather', { city, weather: null, error: 'City not found.' });
    res.render('weather', { city, weather, error: '' });
  } catch (error) {
    res.status(502).render('weather', { city, weather: null, error: error.message || 'Could not fetch weather.' });
  }
});

app.listen(PORT, () => console.log(`Weather utility running at http://localhost:${PORT}`));
