import { serve } from 'bun';
import postgres from 'postgres';

const createMetricsTable = async () => { 
    const sql = postgres(process.env['POSTGRES_CONN_STRING'], { idle_timeout: 3 });

    await sql`DROP TABLE IF EXISTS metrics`;
    await sql`CREATE TABLE IF NOT EXISTS metrics (
      id SERIAL PRIMARY KEY,
      ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      source varchar(100),
      version varchar(50),
      verb varchar(7),
      endpoint TEXT,
      is_async BOOLEAN,
      async_completed varchar(8),
      code INTEGER,
      time DECIMAL(10,2),
      timeunit TEXT,
      time_in_ms DECIMAL(10,2),
      app_db_calls INTEGER,
      app_db_conns INTEGER,
      total_app_db_conns INTEGER,
      jetty_threads INTEGER,
      total_jetty_threads INTEGER,
      jetty_idle INTEGER,
      active_threads INTEGER,
      queries_in_flight INTEGER,
      queued INTEGER,
      dw_id varchar(255),
      dw_db_connections INTEGER,
      dw_db_total_conns INTEGER,
      threads_blocked INTEGER
    )`;
};

if (process.env['POSTGRES_CONN_STRING'] && process.env['CREATE_METRICS_TABLE'] === 'true') {
  createMetricsTable();
}

// Function to transform any time unit into milliseconds
const transformTimeIntoMs = (timeunit, time) => {
  switch (timeunit) {
    case 'µs':
      return time / 1000;
    case 'ms':
      return time;
    case 's':
      return time * 1000;
    case 'm':
      return time * 60000;
    default:
      return time;
  }
};

const processLogs = async (body, request) => {
  const fullTail = {
    traceparent: request.headers.traceparent,
  };

  if (body.mdc) {
    fullTail.trace_id = body.mdc.traceid;
    fullTail.span_id = body.mdc.span_id;
    if (body.exception) {
      fullTail.exception = body.exception.exception_class;
    }
  }

  const reqMessage = {
    streams: [
      {
        stream: {
          source: body.source_host,
          service_name: 'metabase',
          level: body.level,
          logger: body.logger_name,
        },
        values: [[body.timestamp?.toString() || new Date(body.instant.epochSecond).toString(), body.exception ? `${body.message}\n${body.exception.stacktrace}` : body.message, fullTail]],
      },
    ],
  };

  if (process.env['LOKI_HOST']) {
    await fetch(process.env['LOKI_HOST'], {
      method: 'POST',
      body: JSON.stringify(reqMessage),
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

const processMetrics = async (body, values) => {
  if (process.env['INFLUX_ENDPOINT']) {
    const tags = `version=${values.version},source=${values.source}`;
    let influxValues = `verb="${values.verb}",endpoint="${values.endpoint}",is_async="${values.is_async}",async_completed="${values.async_completed}",code=${values.code},time=${values.time},timeunit="${values.timeunit}",time_in_ms=${values.time_in_ms}`;

    const influxFields = [
      'app_db_calls',
      'app_db_conns',
      'total_app_db_conns',
      'jetty_threads',
      'total_jetty_threads',
      'jetty_idle',
      'active_threads',
      'queries_in_flight',
      'queued',
      'dw_id',
      'dw_db_connections',
      'dw_db_total_conns',
      'threads_blocked',
    ];

    influxFields.forEach(field => {
      if (values[field] !== undefined) {
        influxValues += `,${field}=${values[field]}`;
      }
    });

    const ts = new Date().getTime();
    const line = `metrics,${tags} ${influxValues} ${ts}`;

    await fetch(`${process.env['INFLUX_ENDPOINT']}/api/v2/write?org=${process.env['INFLUX_ORG']}&bucket=${process.env['INFLUX_BUCKET']}&precision=ms`, {
      method: 'POST',
      body: line,
      headers: {
        Authorization: `Token ${process.env['INFLUX_TOKEN']}`,
        'Content-Type': 'text/plain; charset=utf-8',
        Accept: 'application/json',
      },
    });
  }

  if (process.env['POSTGRES_CONN_STRING']) {
    const sql = postgres(process.env['POSTGRES_CONN_STRING'], {
      transform: {
        ...postgres.camel,
        undefined: null,
      },
      idle_timeout: 3,
    });

    try {
      await sql`INSERT INTO metrics 
        ${sql(
          values,
          'source',
          'version',
          'verb',
          'endpoint',
          'is_async',
          'async_completed',
          'code',
          'time',
          'timeunit',
          'time_in_ms',
          'app_db_calls',
          'app_db_conns',
          'total_app_db_conns',
          'jetty_threads',
          'total_jetty_threads',
          'jetty_idle',
          'active_threads',
          'queries_in_flight',
          'queued',
          'dw_id',
          'dw_db_connections',
          'dw_db_total_conns',
          'threads_blocked'
        )}`;
      } catch (error) {
        console.error(body.message);
        console.error(values);
        console.error(error);
      }
  }
};

serve({
  async fetch(request) {
    const body = await request.json();
    // console.log(body);

    if (request.method === 'POST' && request.url.includes('logs')) {
      await processLogs(body, request);
      if (process.env['INFLUX_ENDPOINT'] || process.env['POSTGRES_CONN_STRING']) {
        let values = {
          version: process.env['VERSION'] || 'vUNKNOWN',
          source: process.env['SOURCE'] || request.headers.get('host'),
        };

        if (body.message.includes('GET') && !body.message.includes('"initializing"') || body.message.includes('POST') && !body.message.includes('/api/setup') || body.message.includes('PUT') || body.message.includes('DELETE')) {
          const logline = body.message.split(' ');
          values.verb = logline[0].includes('m') ? logline[0].substring(logline[0].indexOf('m') + 1) : logline[0];
          values.endpoint = logline[1];
          values.is_async = body.message.includes('async');
          values.async_completed = values.is_async ? logline[4]?.substring(0, logline[4].length - 1) : '';
          values.code = logline[2] ? parseInt(logline[2]) : '';

          const positions = {
            time: 3,
            timeunit: 4,
            app_db_calls: 5,
            app_db_conns: 11,
            total_app_db_conns: 11,
            jetty_threads: 14,
            total_jetty_threads: 14,
            jetty_idle: 15,
            active_threads: 19,
            queries_in_flight: 26,
            queued: 27,
            dw_id: 29,
            dw_db_connections: 31,
            dw_db_total_conns: 33,
            threads_blocked: 34,
          };

          if (values.code === 202) {
            Object.keys(positions).forEach(key => (positions[key] += 2));
            positions.dw_db_connections += 2;
          }

          if (values.endpoint.includes('tiles')) {
            positions.dw_db_connections += 2;
          }

          values.time = logline[positions.time];
          values.timeunit = logline[positions.timeunit];
          values.time_in_ms = transformTimeIntoMs(values.timeunit, values.time);
          values.app_db_calls = logline[positions.app_db_calls]?.replace('(', '');
          values.app_db_conns = logline[positions.app_db_conns]?.split('/')[0];
          values.total_app_db_conns = logline[positions.total_app_db_conns]?.split('/')[1];
          values.jetty_threads = logline[positions.jetty_threads]?.split('/')[0];
          values.total_jetty_threads = logline[positions.total_jetty_threads]?.split('/')[1];
          values.jetty_idle = logline[positions.jetty_idle]?.replace('(', '');
          values.queued = logline[positions.queued]?.replace('(', '');
          values.active_threads = logline[positions.active_threads]?.replace('(', '');
          values.queries_in_flight = logline[positions.queries_in_flight];
          values.dw_id = logline[positions.dw_id]?.concat('_').concat(logline[positions.dw_id + 2]);
          values.dw_db_connections = logline[positions.dw_db_connections]?.split('/')[0];
          values.dw_db_total_conns = logline[positions.dw_db_total_conns]?.split('/')[1];
          values.threads_blocked = logline[positions.threads_blocked]?.replace('(', '');

          await processMetrics(body, values);
        }
      }
      return new Response({ status: 200 });
    }
  },
});