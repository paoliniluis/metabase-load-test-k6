# Metabase API metric endpoint

You need to configure the following:
1) in Metabase Log4j2.xml you need to create an http appender like:
```
<Http name="HttpAppender" url="http://localhost:3000/logs">
    <JsonTemplateLayout eventTemplateUri="file:///home/luis/Documents/labs/performance_test/logging_config/layout2.json"/>
</Http>
```
The appender needs to have a layout file:
```
{
  "timestamp": {
    "$resolver": "timestamp",
    "epoch": {
      "unit": "nanos"
    }
  },
  "source_host": "${hostName}",
  "level": {
    "$resolver": "level",
    "field": "name"
  },
  "logger_name": {
    "$resolver": "logger",
    "field": "name"
  },
  "message": {
    "$resolver": "message",
    "stringified": true
  },
  "mdc": {
    "$resolver": "mdc"
  },
  "exception": {
    "exception_class": {
      "$resolver": "exception",
      "field": "className"
    },
    "exception_message": {
      "$resolver": "exception",
      "field": "message"
    },
    "stacktrace": {
      "$resolver": "exception",
      "field": "stackTrace",
      "stackTrace": {
        "stringified": true
      }
    }
  }
}
```

Also remember to add the AppenderRef at the root level in the log4j2 config:
```
<AppenderRef ref="HttpAppender"/>
```

2) the metric endpoint will ingest the log lines and split it in parts. The destination of the metrics can be either:
- a Postgres database
- an InfluxDB database

## Environment variables

- VERSION: the version of Metabase you're running (we can't auto detect the version so this is the reason of existance of this env var)
- SOURCE: the source you're sending the info from. If not set, it will grab the host from the headers

## Postgres config

- POSTGRES_CONN_STRING: conn string to postgres like `postgres://metabase:mysecretpassword@localhost:5432/metabase`
- CREATE_METRICS_TABLE: if set to true, it will make a drop of the metrics table if it exists, otherwise it will reuse the table.

If you need to create the metrics table manually, run the following statement in your database:

```
CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    source varchar(100),
    version varchar(50),
    verb varchar(5),
    endpoint TEXT,
    is_async BOOLEAN,
    async_completed varchar(5),
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
  );
```

## InfluxDB

- INFLUX_ENDPOINT: this is the hostname where InfluxDB is running
- INFLUX_TOKEN: this is the token for the authentication to InfluxDB
- INFLUX_ORG: the InfluxDB organization
- INFLUX_BUCKET: the InfluxDB bucket