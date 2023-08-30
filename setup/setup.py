import requests, os

# Authentication

host = os.environ.get('host') if os.environ.get('host') else 'http://localhost'
port = os.environ.get('port') if os.environ.get('port') else '3001'
healthCheckEndpoint = f'{host}:{port}/api/health'
properties = f'{host}:{port}/api/session/properties'
setup = f'{host}:{port}/api/setup'
database = f'{host}:{port}/api/database'
login = f'{host}:{port}/api/session'

pg_sample_15 = {
    'engine':'postgres',
    'name':'pg',
    'details': {
        'host':'postgres-data1-load',
        'port':'5432',
        'dbname':'sample',
        'user':'metabase',
        'password':'metasample123',
        'schema-filters-type':'all',
        'ssl':False,
        'tunnel-enabled':False,
        'advanced-options':False
    },
    'is_full_sync':True
}

app_db = {'engine':'postgres','name':'postgres-app-db','details':{'host':'postgres-app-db-load','port':'5432','dbname':'metabase','user':'metabase','password':'mysecretpassword','schema-filters-type':'all','ssl':False,'tunnel-enabled':False,'advanced-options':False},'is_full_sync':True}

dbs = [pg_sample_15, app_db]

def health():
    response = requests.get(healthCheckEndpoint, verify=False)
    if response.json()['status'] == 'ok':
        return 'healthy'
    else:
        health()

if health() == 'healthy' and os.environ.get('retry') == 'yes':
    loginPayload = { 'username': 'a@b.com', 'password': 'metabot1' }
    session = requests.Session()
    sessionToken = session.post(login, verify=False, json=loginPayload)
    for i in range(int(os.environ.get('dbs'))):
        db = dbs[i]
        session.post(database, verify=False, json=db)
    session.delete(f'{database}/1')

if health() == 'healthy' and os.environ.get('retry') is None:
    session = requests.Session()
    token = session.get(properties, verify=False).json()['setup-token']
    setupPayload = {
        'token':f'{token}',
        'user':{
            'first_name':'a',
            'last_name':'b',
            'email':'a@b.com',
            'site_name':'metabot1',
            'password':'metabot1',
            'password_confirm':'metabot1'
        },
        'database':None,
        'invite':None,
        'prefs':{
            'site_name':'metabot1',
            'site_locale':'en',
            'allow_tracking':False
        }
    }
    try:
        sessionToken = session.post(setup, verify=False, json=setupPayload).json()['id']

        for i in range(int(os.environ.get('dbs'))):
            db = dbs[i]
            session.post(database, verify=False, json=db)
        
        # delete the sample DB
        session.delete(f'{database}/1')

    except:
        exit()