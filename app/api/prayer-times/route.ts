import { acjuCityZones } from '../../../lib/acju-zones';
import { getAcjuSchedule, isPrayerDate } from '../../../lib/acju';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const city = params.get('city') || 'Colombo';
  const date = params.get('date') || '';
  const school = params.get('school') === '1' ? '1' : '0';
  if (!Object.hasOwn(acjuCityZones, city) || !isPrayerDate(date)) {
    return Response.json({ error: 'Choose a valid Sri Lankan city and date.' }, { status: 400 });
  }
  const schedule = getAcjuSchedule(date, city, school);
  if (!schedule) return Response.json({ error: 'No published ACJU timetable is available for this date and district. Please check ACJU’s official timetable.' }, { status: 404 });
  return Response.json(schedule, { headers: { 'Cache-Control': 'no-store' } });
}
