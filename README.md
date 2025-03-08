Metabase performance testing w/K6
===============================

## Components

- Metabase is exposed through port 3000
- A python container that initializes Metabase by adding a@b.com / metabot1 as the user/pass, adds the data db and deletes the H2 sample DB. It will also create a dashboard via an x-ray to use during the process.
- K6 running on a container that will start when the previous container finishes and will perform the stress test in k6-script/script.js
- HAProxy with 2 SSH bastion hosts behind. This was introduced to test how Metabase behaves when tunnels go down and even the introduced latency of the SSH tunnel if needed.

## Performance considerations:

1) Metabase App is resource constrained on CPU in order to see how many concurrent users can sustain on the load testing
2) App DB should have more than enough resources to sustain the load, also Metabase has MB_DISABLE_SESSION_THROTTLE and MB_APPLICATION_DB_MAX_CONNECTION_POOL_SIZE defaults changed
3) The endpoints called in this test hit the Metabase app db, and not the one with sample data, this is because we want to evaluate the performance of Metabase since running queries in the postgres database can heavily affect these results (the majority of the time is Metabase waiting for the queries from the DW to return)

### K6 test:
1) check the stages in script.js to know how the load is pushed towards the application
2) code can be heavily optimized, this is a weekend's project to look for the cause of some performance regressions
3) we don't evaluate how fast the queries return from the Data DB here, it's just for checking how fast Metabase is and to make recommendations about the size of the server
4) sleep's are in the code to try to separate the calls and make the load tests as "natural" as possible, but this is just a dreamer's dream

Note for Apple Mac users: ensure that you're using a native ARM base image here, since x86 images can heavily impact your performance

## How to test

Just change the Metabase container version and resources assigned to the Metabase container to see if it sustains the load. Set the tunnels true or false in line 226 (this will make Metabase to connect to the DW via an SSH tunnel or not)

## Changelog

- Jul 2024 - Added the new bun api endpoint and tweaked the logging config. Now Metabase will send the log lines to this endpoint and those will be persisted on an app DB table called metrics. This is used to analyze performance on every single api call
- Mar 2025 - Made the script more realistic by testing more endpoints. Introduced the SSH tunnel component in the stack.