export interface WeatherPlace {
  name: string;
  lat: number;
  lon: number;
}

export interface WeatherDay {
  date: string;
  code: number;
  max: number;
  min: number;
}

export interface WeatherNow {
  temperature: number;
  feelsLike: number;
  code: number;
  day: boolean;
  wind: number;
  humidity: number;
  max: number;
  min: number;
  days: WeatherDay[];
}

export type WeatherCondition =
  'clear' | 'partlyCloudy' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'showers' | 'thunder';

export function weatherCondition(code: number): WeatherCondition {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partlyCloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 80 && code <= 82) return 'showers';
  if (code >= 95) return 'thunder';
  return 'rain';
}

const ICONS: Record<WeatherCondition, [day: string, night: string]> = {
  clear: ['i-meteocons:clear-day-fill', 'i-meteocons:clear-night-fill'],
  partlyCloudy: ['i-meteocons:partly-cloudy-day-fill', 'i-meteocons:partly-cloudy-night-fill'],
  cloudy: ['i-meteocons:overcast-day-fill', 'i-meteocons:overcast-night-fill'],
  fog: ['i-meteocons:fog-day-fill', 'i-meteocons:fog-night-fill'],
  drizzle: [
    'i-meteocons:partly-cloudy-day-drizzle-fill',
    'i-meteocons:partly-cloudy-night-drizzle-fill',
  ],
  rain: ['i-meteocons:overcast-day-rain-fill', 'i-meteocons:overcast-night-rain-fill'],
  showers: ['i-meteocons:partly-cloudy-day-rain-fill', 'i-meteocons:partly-cloudy-night-rain-fill'],
  snow: ['i-meteocons:overcast-day-snow-fill', 'i-meteocons:overcast-night-snow-fill'],
  thunder: ['i-meteocons:thunderstorms-day-fill', 'i-meteocons:thunderstorms-night-fill'],
};

export function weatherIcon(code: number, day = true): string {
  const [dayIcon, nightIcon] = ICONS[weatherCondition(code)];
  return day ? dayIcon : nightIcon;
}

export async function placeName(lat: number, lon: number, lang: string): Promise<string | null> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(lat),
    lon: String(lon),
    zoom: '10',
    'accept-language': lang,
  });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`);
    const address = res.ok ? (await res.json())?.address : null;
    const city = [
      address?.city,
      address?.town,
      address?.village,
      address?.county,
      address?.state,
    ].find((v) => typeof v === 'string' && v);
    if (!city) return null;
    const country =
      typeof address?.country_code === 'string' ? address.country_code.toUpperCase() : '';
    return country ? `${city}, ${country}` : city;
  } catch {
    return null;
  }
}

export async function findPlace(query: string): Promise<WeatherPlace | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(query.trim())}`;
  try {
    const answer = await (await fetch(url)).json();
    const hit = answer?.results?.[0];
    if (!hit || typeof hit.latitude !== 'number' || typeof hit.longitude !== 'number') return null;
    const name = [hit.name, hit.country_code].filter((p) => typeof p === 'string').join(', ');
    return { name, lat: hit.latitude, lon: hit.longitude };
  } catch {
    return null;
  }
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function readForecast(answer: unknown): WeatherNow | null {
  const a = answer as {
    current?: Record<string, unknown>;
    daily?: Record<string, unknown[]>;
  } | null;
  const now = a?.current;
  const daily = a?.daily;
  if (!now || !num(now['temperature_2m']) || !num(now['weather_code'])) return null;
  const dates = Array.isArray(daily?.['time']) ? (daily['time'] as unknown[]) : [];
  const days = dates.flatMap((date, i) => {
    const code = daily?.['weather_code']?.[i];
    const max = daily?.['temperature_2m_max']?.[i];
    const min = daily?.['temperature_2m_min']?.[i];
    return typeof date === 'string' && num(code) && num(max) && num(min)
      ? [{ date, code, max: Math.round(max), min: Math.round(min) }]
      : [];
  });
  return {
    temperature: Math.round(now['temperature_2m']),
    feelsLike: Math.round(
      num(now['apparent_temperature']) ? now['apparent_temperature'] : now['temperature_2m'],
    ),
    code: now['weather_code'],
    day: now['is_day'] !== 0,
    wind: Math.round(num(now['wind_speed_10m']) ? now['wind_speed_10m'] : 0),
    humidity: Math.round(num(now['relative_humidity_2m']) ? now['relative_humidity_2m'] : 0),
    max: days[0]?.max ?? Math.round(now['temperature_2m']),
    min: days[0]?.min ?? Math.round(now['temperature_2m']),
    days,
  };
}

export async function currentWeather(
  place: WeatherPlace,
  unit: 'c' | 'f',
): Promise<WeatherNow | null> {
  const params = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    current:
      'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '6',
    temperature_unit: unit === 'f' ? 'fahrenheit' : 'celsius',
    wind_speed_unit: unit === 'f' ? 'mph' : 'kmh',
  });
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    return res.ok ? readForecast(await res.json()) : null;
  } catch {
    return null;
  }
}
