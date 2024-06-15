Metabase performance testing w/K6
===============================

## Components

- Metabase is exposed through port 3001
- App DB (PosgreSQL() is exposed through port 5432
- Data DB (PosgreSQL() is exposed through port 5433
- A python container that initializes Metabase by adding a@b.com / metabot1 as the user/pass, adds the data db and deletes the H2 sample DB
- K6 running on a container that will start when the previous container finishes

## Performance considerations:

1) Metabase App is resource constrained on CPU in order to see how many concurrent users can sustain on the load testing
2) App DB has more than enough resources to sustain the load, also Metabase has MB_DISABLE_SESSION_THROTTLE and MB_APPLICATION_DB_MAX_CONNECTION_POOL_SIZE defaults changed

K6 test:
1) check the stages in script.js to know how the load is pushed towards the application
2) code can be heavily optimized, this is a weekend's project to look for the cause of some performance regressions
3) we don't evaluate how fast the queries return from the Data DB here, it's just for checking how fast Metabase is and to make recommendations about the size of the server
4) sleep's are in the code to try to separate the calls and make the load tests as "natural" as possible, but this is just a dreamer's dream

Mac users: you need to follow the same pattern as in https://github.com/paoliniluis/postgres-metabase-stack-m1, and bundle Metabase inside a aarch64 image, till we can ship an ARM container image

## How to test

Just change the Metabase container version and resources assigned to the Metabase container to see if it sustains the load

## Changelog

- Jul 2024 - Added the new bun api endpoint and tweaked the logging config. Now Metabase will send the log lines to this endpoint and those will be persisted on an app DB table called metrics. This is used to analyze performance on every single api call