import { describe, expect, it } from 'vitest';
import { readForecast, weatherCondition, weatherIcon } from './weather';

describe('weatherIcon', () => {
  it('picks a Meteocons icon for the WMO weather codes', () => {
    expect(weatherIcon(0)).toBe('i-meteocons:clear-day-fill');
    expect(weatherIcon(2)).toBe('i-meteocons:partly-cloudy-day-fill');
    expect(weatherIcon(3)).toBe('i-meteocons:overcast-day-fill');
    expect(weatherIcon(45)).toBe('i-meteocons:fog-day-fill');
    expect(weatherIcon(63)).toBe('i-meteocons:overcast-day-rain-fill');
    expect(weatherIcon(73)).toBe('i-meteocons:overcast-day-snow-fill');
    expect(weatherIcon(95)).toBe('i-meteocons:thunderstorms-day-fill');
  });
  it('uses the night icons at night', () => {
    expect(weatherIcon(0, false)).toBe('i-meteocons:clear-night-fill');
    expect(weatherIcon(1, false)).toBe('i-meteocons:partly-cloudy-night-fill');
  });
});

describe('weatherCondition', () => {
  it('names the condition', () => {
    expect(weatherCondition(0)).toBe('clear');
    expect(weatherCondition(53)).toBe('drizzle');
    expect(weatherCondition(81)).toBe('showers');
  });
});

describe('readForecast', () => {
  it('reads the current weather and the days', () => {
    const now = readForecast({
      current: {
        temperature_2m: 20.4,
        apparent_temperature: 19.6,
        weather_code: 2,
        is_day: 0,
        wind_speed_10m: 11.2,
        relative_humidity_2m: 64,
      },
      daily: {
        time: ['2026-11-01', '2026-11-02'],
        weather_code: [2, 61],
        temperature_2m_max: [22.6, 18.1],
        temperature_2m_min: [14.2, 12.9],
      },
    });
    expect(now).toEqual({
      temperature: 20,
      feelsLike: 20,
      code: 2,
      day: false,
      wind: 11,
      humidity: 64,
      max: 23,
      min: 14,
      days: [
        { date: '2026-11-01', code: 2, max: 23, min: 14 },
        { date: '2026-11-02', code: 61, max: 18, min: 13 },
      ],
    });
  });
  it('is null for an answer without the current weather', () => {
    expect(readForecast({})).toBeNull();
    expect(readForecast(null)).toBeNull();
  });
});
