import requests, os, time

from sqlalchemy.engine import make_url

host = os.environ.get('host') if os.environ.get('host') else 'http://localhost'
port = os.environ.get('port') if os.environ.get('port') else '3001'
healthCheckEndpoint = f'{host}:{port}/api/health'
propertiesEndpoint = f'{host}:{port}/api/session/properties'
setupEndpoint = f'{host}:{port}/api/setup'
databaseEndpoint = f'{host}:{port}/api/database'
loginEndpoint = f'{host}:{port}/api/session'
groupEndpoint = f'{host}:{port}/api/permissions/group'
permissionsGraphEndpoint = f'{host}:{port}/api/permissions/graph'
connection_string = os.environ.get('connection_string') if os.environ.get('connection_string') else 'postgres://metabase:metabase@postgres-data1-load:5432/sample'

database = make_url(connection_string)

supported_dbs = ['postgres', 'postgresql', 'mysql']
soon_supported_dbs = ['athena', 'bigquery', 'oracle', 'redshift', 'sqlite', 'sqlserver', 'vertica', 'databricks', 'mongo', 'snowflake', 'druid']

if database.drivername in soon_supported_dbs:
    print('Soon to be supported database, please create a feature request on the issue tracker')
    print('Right now the only supported databases are: ', supported_dbs)
    exit()

if database.drivername not in supported_dbs and database.drivername not in soon_supported_dbs:
    print('Unsupported database')
    exit()

def health():
    response = requests.get(healthCheckEndpoint, verify=False)
    if response.json()['status'] == 'ok':
        return 'healthy'
    else:
        health()

def finished(session, database_id):
    response = session.get(f'{databaseEndpoint}/{database_id}', verify=False)
    if response.json()['initial_sync_status'] == 'complete':
        return True
    else:
        return False

if health() == 'healthy' and database.drivername in supported_dbs:
    print('drivername: ', database.drivername)
    print('username: ', database.username)
    print('password: ', database.password)
    print('host: ', database.host)
    print('port: ', database.port)
    print('database: ', database.database)
    
    session = requests.Session()
    token = session.get(propertiesEndpoint, verify=False).json()['setup-token']
    setupPayload = {
        'token':f'{token}',
        'user':{
            'first_name':'a',
            'last_name':'b',
            'email':'a@b.com',
            'password':'metabot1',
        },
        'prefs':{
            'site_name':'metabot1',
            'site_locale':'en',
            'allow_tracking':False
        }
    }
    try:
        sessionToken = session.post(setupEndpoint, verify=False, json=setupPayload).json()['id']

        db_with_tunnel = {
            "is_on_demand":False,
            "is_full_sync":True,
            "is_sample":False,
            "cache_ttl":None,
            "refingerprint":False,
            "auto_run_queries":True,
            "schedules":{},
            "details":{
                "host": database.host,
                "port": database.port,
                "dbname": database.database,
                "user": database.username,
                "password": database.password,
                "schema-filters-type":"all",
                "ssl":False,
                "tunnel-enabled":True,
                "tunnel-port":2222,
                "tunnel-host":"haproxy-ssh-load",
                "tunnel-user":"metabase",
                "tunnel-private-key": "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABCUUjov89\na69l0fjxRMPj45AAAAEAAAAAEAAAAzAAAAC3NzaC1lZDI1NTE5AAAAINaVvzSukjVtGgdg\n7ejckHZ8PbbMif9lqk7Ws+1excxJAAAAoCQiHwFoeVomvkBtGlh+hQWleLNXTc3spMmzHA\niE4Pt00S3XIw2bhjISY/sasSNnSTPULujlBY3UbnCbR7BzHilmf43Q7/Bc575GutTJ0cnc\n7t6EAPhSl7lX7kXgLiHIf8RGrQuGlrTrfiGLhpojPEssV3GfBIzKiCd0VMxQmoEll2oIjJ\n+8JBM0XOdRtK80gb1oezAdOI1h4mjRfYUp95c=\n-----END OPENSSH PRIVATE KEY-----\n",
                "tunnel-private-key-passphrase": "mysecretpassword",
                "advanced-options":False
                },
            "name": "My Database",
            "engine": database.drivername
        }

        db_without_tunnel = {
            "is_on_demand":False,
            "is_full_sync":True,
            "is_sample":False,
            "cache_ttl":None,
            "refingerprint":False,
            "auto_run_queries":True,
            "schedules":{},
            "details":{
                "host": database.host,
                "port": database.port,
                "dbname": database.database,
                "user": database.username,
                "password": database.password,
                "schema-filters-type":"all",
                "ssl":False,
                "tunnel-enabled":False,
                "advanced-options":False
                },
            "name": "My Database",
            "engine": database.drivername
        }

        session.delete(f'{databaseEndpoint}/1')
        if os.environ.get('tunnel') == 'True':
            myDatabase = session.post(databaseEndpoint, verify=False, json=db_with_tunnel)
        else:
            myDatabase = session.post(databaseEndpoint, verify=False, json=db_without_tunnel)
        myDatabase = myDatabase.json()['id']

        finished_syncing = finished(session, myDatabase)
        while not finished_syncing:
            time.sleep(1)
            finished_syncing = finished(session, myDatabase)
            print('Not fully synced yet... waiting 1 second')

        if finished_syncing:
            session.post(f'{groupEndpoint}', verify=False, json={"name":"viewer"})
            session.put(
                f'{permissionsGraphEndpoint}',
                verify=False,
                json={
                "groups": {
                    "3": {
                        "1": {
                            "view-data": "unrestricted",
                            "download": {
                                "schemas": "full"
                            },
                            "create-queries": "query-builder"
                        }
                    }
                },
                "revision": 0,
                "sandboxes": [],
                "impersonations": []
                }
            )
            print('Database fully synced')
            candidates = session.get(f'{host}:{port}/api/automagic-dashboards/database/{myDatabase}/candidates', verify=False)
            candidates = candidates.json()[0]['tables']
            candidateTables = []

            for candidate in candidates:
                if candidate['title'] == os.environ.get('table'):
                    candidateTables.append(candidate['table']['id'])
            
            for table in candidateTables:
                table_metadata = session.get(f'{host}:{port}/api/automagic-dashboards/table/{table}', verify=False)
                table_data = table_metadata.json()
                dashboard_payload = {
                    'auto_apply_filters': table_data['auto_apply_filters'],
                    'creator_id': table_data['creator_id'],
                    'dashcards': table_data['dashcards'],
                    'description': table_data['description'],
                    'name': table_data['name'],
                    'parameters': table_data['parameters'],
                    'related': table_data['related'],
                    'width': "fixed"
                }
                dashboard = session.post(f'{host}:{port}/api/dashboard/save', verify=False, json=dashboard_payload)
                dashboard = dashboard.json()['id']


    except Exception as e:
        print(e)
        exit()