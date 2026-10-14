// Prayer times computed on-device from the sun's position (PrayTimes-style astronomical method).
// Fajr and Isha at 18° below the horizon, Shafi'i Asr (shadow = object length), as used in Tunisia.

import type { PrayerName } from '@/lib/database.types';

export const PRAYERS: { key: PrayerName; name: string; arabic: string }[] = [
  { key: 'fajr', name: 'Fajr', arabic: 'الفجر' },
  { key: 'dhuhr', name: 'Dhuhr', arabic: 'الظهر' },
  { key: 'asr', name: 'Asr', arabic: 'العصر' },
  { key: 'maghrib', name: 'Maghrib', arabic: 'المغرب' },
  { key: 'isha', name: 'Isha', arabic: 'العشاء' },
];

export const CITIES = [
  { id: 'tunis', name: 'Tunis', lat: 36.8065, lng: 10.1815 },
  { id: 'ariana', name: 'Ariana', lat: 36.8625, lng: 10.1956 },
  { id: 'bizerte', name: 'Bizerte', lat: 37.2744, lng: 9.8739 },
  { id: 'nabeul', name: 'Nabeul', lat: 36.4561, lng: 10.7376 },
  { id: 'sousse', name: 'Sousse', lat: 35.8256, lng: 10.6084 },
  { id: 'monastir', name: 'Monastir', lat: 35.7643, lng: 10.8113 },
  { id: 'kairouan', name: 'Kairouan', lat: 35.6781, lng: 10.0963 },
  { id: 'sfax', name: 'Sfax', lat: 34.7406, lng: 10.7603 },
  { id: 'gabes', name: 'Gabès', lat: 33.8815, lng: 10.0982 },
  { id: 'djerba', name: 'Djerba', lat: 33.8076, lng: 10.8451 },
] as const;

export type CityId = (typeof CITIES)[number]['id'];

const FAJR_ANGLE = 18;
const ISHA_ANGLE = 18;
const SUN_ANGLE = 0.833; // refraction + sun's radius at sunrise/sunset

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const fix = (a: number, b: number) => ((a % b) + b) % b;
const sin = (d: number) => Math.sin(rad(d));
const cos = (d: number) => Math.cos(rad(d));
const tan = (d: number) => Math.tan(rad(d));

function julian(year: number, month: number, day: number) {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

function sunPosition(jd: number) {
  const d = jd - 2451545.0;
  const g = fix(357.529 + 0.98560028 * d, 360);
  const q = fix(280.459 + 0.98564736 * d, 360);
  const l = fix(q + 1.915 * sin(g) + 0.02 * sin(2 * g), 360);
  const e = 23.439 - 0.00000036 * d;
  const ra = fix(deg(Math.atan2(cos(e) * sin(l), cos(l))) / 15, 24);
  return { declination: deg(Math.asin(sin(e) * sin(l))), equation: q / 15 - ra };
}

/** Times for one local calendar day, as Dates. */
export function prayerTimes(date: Date, lat: number, lng: number) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const jd = julian(y, m + 1, d) - lng / (15 * 24);
  const tz = -new Date(y, m, d, 12).getTimezoneOffset() / 60;

  const midDay = (t: number) => fix(12 - sunPosition(jd + t).equation, 24);
  const angleTime = (angle: number, t: number, before: boolean) => {
    const { declination } = sunPosition(jd + t);
    const span = deg(Math.acos((-sin(angle) - sin(declination) * sin(lat)) / (cos(declination) * cos(lat)))) / 15;
    return midDay(t) + (before ? -span : span);
  };
  const asrTime = (factor: number, t: number) => {
    const { declination } = sunPosition(jd + t);
    const angle = -deg(Math.atan(1 / (factor + tan(Math.abs(lat - declination)))));
    return angleTime(angle, t, false);
  };

  // One refinement pass starting from rough guesses (hours / 24).
  const hours = {
    fajr: angleTime(FAJR_ANGLE, 5 / 24, true),
    sunrise: angleTime(SUN_ANGLE, 6 / 24, true),
    dhuhr: midDay(12 / 24),
    asr: asrTime(1, 13 / 24),
    maghrib: angleTime(SUN_ANGLE, 18 / 24, false),
    isha: angleTime(ISHA_ANGLE, 18 / 24, false),
  };
  const toDate = (h: number) => new Date(new Date(y, m, d).getTime() + (h + tz - lng / 15) * 3_600_000);
  return {
    fajr: toDate(hours.fajr),
    sunrise: toDate(hours.sunrise),
    dhuhr: toDate(hours.dhuhr),
    asr: toDate(hours.asr),
    maghrib: toDate(hours.maghrib),
    isha: toDate(hours.isha),
  };
}

export function cityById(id: string) {
  return CITIES.find((c) => c.id === id) ?? CITIES[0];
}

/** e.g. "12 Rabiʻ II 1448", or null where the Islamic calendar isn't available. */
export function hijriDate(date: Date) {
  try {
    return new Intl.DateTimeFormat('en-TN-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' })
      .format(date)
      .replace(/\s?AH$/, '');
  } catch {
    return null;
  }
}
