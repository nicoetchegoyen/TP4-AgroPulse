insert into public.organizations (id, name, region)
values ('10000000-0000-4000-8000-000000000001', 'Estancia Didáctica Concordia', 'Concordia, Entre Ríos')
on conflict (id) do update set name = excluded.name, region = excluded.region;

insert into public.plots (id, organization_id, name, crop, geom, threshold_min, threshold_max)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Costa 1',
    'Citrus',
    '{"type":"Polygon","coordinates":[[[-58.029,-31.394],[-58.021,-31.394],[-58.021,-31.388],[-58.029,-31.388],[-58.029,-31.394]]]}'::jsonb,
    25,
    45
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Costa 2',
    'Citrus',
    '{"type":"Polygon","coordinates":[[[-58.020,-31.394],[-58.012,-31.394],[-58.012,-31.388],[-58.020,-31.388],[-58.020,-31.394]]]}'::jsonb,
    25,
    45
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'Monte A',
    'Soja',
    '{"type":"Polygon","coordinates":[[[-58.025,-31.402],[-58.016,-31.402],[-58.016,-31.396],[-58.025,-31.396],[-58.025,-31.402]]]}'::jsonb,
    25,
    45
  )
on conflict (id) do update set
  name = excluded.name,
  crop = excluded.crop,
  geom = excluded.geom,
  threshold_min = excluded.threshold_min,
  threshold_max = excluded.threshold_max;

insert into public.stations (id, plot_id, name, lat, lng)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Estación Costa 1', -31.391, -58.025),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Estación Costa 2', -31.391, -58.016),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'Estación Monte A', -31.399, -58.020)
on conflict (id) do update set name = excluded.name, lat = excluded.lat, lng = excluded.lng;

insert into public.valves (id, plot_id, name, status)
values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Válvula Norte', 'closed'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Válvula Principal', 'closed'),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'Válvula Monte', 'closed')
on conflict (id) do update set name = excluded.name;

delete from public.readings
where station_id in (
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000003'
);

insert into public.readings (station_id, measured_at, moisture_pct, temp_c, rain_mm, source)
select
  station_id,
  measured_at,
  round((base_moisture + sin(point / 3.0) * 1.4)::numeric, 1)::real,
  round((24 + cos(point / 4.0) * 2.2)::numeric, 1)::real,
  case when point % 11 = 0 then 0.4 else 0 end,
  'sensor'::public.reading_source
from (
  select
    station_id,
    point,
    base_moisture,
    now() - ((23 - point) * interval '15 minutes') - stale_offset as measured_at
  from (
    values
      ('30000000-0000-4000-8000-000000000001'::uuid, 33.0::real, interval '0 minutes'),
      ('30000000-0000-4000-8000-000000000002'::uuid, 18.0::real, interval '0 minutes'),
      ('30000000-0000-4000-8000-000000000003'::uuid, 31.0::real, interval '30 minutes')
  ) as stations(station_id, base_moisture, stale_offset)
  cross join generate_series(0, 23) as series(point)
) generated;

insert into public.alerts (id, plot_id, type, payload, created_at)
values
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'dry', '{"moisture_pct":18,"threshold_min":25}', now() - interval '2 minutes'),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'stale', '{"last_seen_minutes":30}', now() - interval '15 minutes')
on conflict (id) do update set payload = excluded.payload, created_at = excluded.created_at;
