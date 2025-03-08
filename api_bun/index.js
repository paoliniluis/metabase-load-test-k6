import { serve } from 'bun';
import postgres from 'postgres';

// Create a connection pool
const sql = postgres(process.env['POSTGRES_CONN_STRING'], {
  max: 10, // Adjust based on your needs
  idle_timeout: 30,
  transform: {
    ...postgres.camel,
    undefined: null,
  },
});

const createMetricsTable = async () => {
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
  createMetricsTable().catch(console.error);
}

const timeUnitToMs = {
  'µs': 0.001,
  'ms': 1,
  's': 1000,
  'm': 60000,
};

const transformTimeIntoMs = (timeunit, time) => (timeUnitToMs[timeunit] || 1) * time;

const processLogs = async (body, request) => {
  const fullTail = {
    traceparent: request.headers.traceparent,
    trace_id: body.mdc?.traceid,
    span_id: body.mdc?.span_id,
    exception: body.exception?.exception_class,
  };

  const reqMessage = {
    streams: [{
      stream: {
        source: body.source_host,
        service_name: 'metabase',
        level: body.level,
        logger: body.logger_name,
      },
      values: [[
        body.timestamp.toString(),
        body.exception ? `${body.message}\n${body.exception.stacktrace}` : body.message,
        fullTail
      ]],
    }],
  };

  if (process.env['LOKI_HOST']) {
    try {
      const response = await fetch(process.env['LOKI_HOST'], {
        method: 'POST',
        body: JSON.stringify(reqMessage),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      console.error('Error sending logs to Loki:', error);
    }
  }
};

const processMetrics = async (body, values) => {
  if (process.env['INFLUX_ENDPOINT']) {
    const tags = `version=${values.version},source=${values.source}`;
    const influxValues = Object.entries(values)
      .filter(([key, value]) => value !== undefined && !['version', 'source'].includes(key))
      .map(([key, value]) => `${key}=${typeof value === 'string' ? `"${value}"` : value}`)
      .join(',');

    const ts = new Date().getTime();
    const line = `metrics,${tags} ${influxValues} ${ts}`;

    try {
      const response = await fetch(`${process.env['INFLUX_ENDPOINT']}/api/v2/write?org=${process.env['INFLUX_ORG']}&bucket=${process.env['INFLUX_BUCKET']}&precision=ms`, {
        method: 'POST',
        body: line,
        headers: {
          Authorization: `Token ${process.env['INFLUX_TOKEN']}`,
          'Content-Type': 'text/plain; charset=utf-8',
          Accept: 'application/json',
        },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    } catch (error) {
      console.error('Error sending metrics to InfluxDB:', error);
    }
  }

  if (process.env['POSTGRES_CONN_STRING']) {
    try {
      await sql`INSERT INTO metrics ${sql(values, ...Object.keys(values))}`;
    } catch (error) {
      console.error('Error inserting metrics into PostgreSQL:', error);
    }
  }
};

const parseLogLine = (message) => {
  const logline = message.split(' ');
  const values = {
    verb: logline[0].match(/m(.+)/)?.[1] || logline[0],
    endpoint: logline[1],
    is_async: message.includes('async'),
    code: parseInt(logline[2]) || null,
  };

  const positions = {
    time: 3, timeunit: 4, app_db_calls: 5, app_db_conns: 11, total_app_db_conns: 11,
    jetty_threads: 14, total_jetty_threads: 14, jetty_idle: 15, active_threads: 19,
    queries_in_flight: 26, queued: 27, dw_id: 29, dw_db_connections: 31,
    dw_db_total_conns: 33, threads_blocked: 34,
  };

  if (values.code === 202) {
    Object.keys(positions).forEach(key => positions[key] += 2);
  }

  if (values.endpoint.includes('tiles')) {
    positions.dw_db_connections += 2;
  }

  const safeParseInt = (value) => {
    const parsed = parseInt(value);
    return isNaN(parsed) ? null : parsed;
  };

  const safeParseFloat = (value) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  };

  values.time = safeParseFloat(logline[positions.time]);
  values.timeunit = logline[positions.timeunit];
  values.time_in_ms = safeParseFloat(transformTimeIntoMs(values.timeunit, values.time));
  values.app_db_calls = safeParseInt(logline[positions.app_db_calls]?.replace('(', ''));
  [values.app_db_conns, values.total_app_db_conns] = (logline[positions.app_db_conns]?.split('/') || []).map(safeParseInt);
  [values.jetty_threads, values.total_jetty_threads] = (logline[positions.jetty_threads]?.split('/') || []).map(safeParseInt);
  values.jetty_idle = safeParseInt(logline[positions.jetty_idle]?.replace('(', ''));
  values.queued = safeParseInt(logline[positions.queued]?.replace('(', ''));
  values.active_threads = safeParseInt(logline[positions.active_threads]?.replace('(', ''));
  values.queries_in_flight = safeParseInt(logline[positions.queries_in_flight]);
  values.dw_id = logline[positions.dw_id] && `${logline[positions.dw_id]}_${logline[positions.dw_id + 2]}`;
  [values.dw_db_connections, values.dw_db_total_conns] = (logline[positions.dw_db_connections]?.split('/') || []).map(safeParseInt);
  values.threads_blocked = safeParseInt(logline[positions.threads_blocked]?.replace('(', ''));

  return values;
};

serve({
  async fetch(request) {
    if (request.method !== 'POST' || !request.url.includes('logs')) {
      return new Response('Not Found', { status: 404 });
    }

    try {
      const body = await request.json();
      await processLogs(body, request);

      if (process.env['INFLUX_ENDPOINT'] || process.env['POSTGRES_CONN_STRING']) {
        const message = body.message;
        if (/GET|POST|PUT|DELETE/.test(message) && !message.includes('"initializing"') && !message.includes('/api/setup')) {
          const values = {
            ...parseLogLine(message),
            version: process.env['VERSION'] || 'vUNKNOWN',
            source: process.env['SOURCE'] || request.headers.get('host'),
          };
          await processMetrics(body, values);
        }
      }

      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('Error processing request:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
});