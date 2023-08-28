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
        'host':'postgres-data1',
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
        
postgres_big = {
    'engine':'postgres',
    'name':'postgres-other',
    'details': {
        'host':'postgres-another-data',
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

app_db = {'engine':'postgres','name':'postgres-app-db','details':{'host':'postgres-app-db','port':'5432','dbname':'metabase','user':'metabase','password':'mysecretpassword','schema-filters-type':'all','ssl':False,'tunnel-enabled':False,'advanced-options':False},'is_full_sync':True}

# postgres_ssh_1 = {"is_on_demand":False,"is_full_sync":True,"is_sample":False,"cache_ttl":None,"refingerprint":False,"auto_run_queries":True,"schedules":{},"details":{"host":"postgres-data1","port":5432,"dbname":"sample","user":"metabase","password":"metasample123","schema-filters-type":"all","ssl":False,"tunnel-enabled":True,"tunnel-host":"ssh-choke","tunnel-port":2222,"tunnel-user":"metabase","tunnel-auth-option":"ssh-key","tunnel-private-key":"-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABCUUjov89\na69l0fjxRMPj45AAAAEAAAAAEAAAAzAAAAC3NzaC1lZDI1NTE5AAAAINaVvzSukjVtGgdg\n7ejckHZ8PbbMif9lqk7Ws+1excxJAAAAoCQiHwFoeVomvkBtGlh+hQWleLNXTc3spMmzHA\niE4Pt00S3XIw2bhjISY/sasSNnSTPULujlBY3UbnCbR7BzHilmf43Q7/Bc575GutTJ0cnc\n7t6EAPhSl7lX7kXgLiHIf8RGrQuGlrTrfiGLhpojPEssV3GfBIzKiCd0VMxQmoEll2oIjJ\n+8JBM0XOdRtK80gb1oezAdOI1h4mjRfYUp95c=\n-----END OPENSSH PRIVATE KEY-----","tunnel-private-key-passphrase":"mysecretpassword","advanced-options":False},"name":"pg-ssh","engine":"postgres"}
# postgres_ssh_2 = {"is_on_demand":False,"is_full_sync":True,"is_sample":False,"cache_ttl":None,"refingerprint":False,"auto_run_queries":True,"schedules":{},"details":{"host":"postgres-another-data","port":5432,"dbname":"sample","user":"metabase","password":"metasample123","schema-filters-type":"all","ssl":False,"tunnel-enabled":True,"tunnel-host":"ssh-choke","tunnel-port":2222,"tunnel-user":"metabase","tunnel-auth-option":"ssh-key","tunnel-private-key":"-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABCUUjov89\na69l0fjxRMPj45AAAAEAAAAAEAAAAzAAAAC3NzaC1lZDI1NTE5AAAAINaVvzSukjVtGgdg\n7ejckHZ8PbbMif9lqk7Ws+1excxJAAAAoCQiHwFoeVomvkBtGlh+hQWleLNXTc3spMmzHA\niE4Pt00S3XIw2bhjISY/sasSNnSTPULujlBY3UbnCbR7BzHilmf43Q7/Bc575GutTJ0cnc\n7t6EAPhSl7lX7kXgLiHIf8RGrQuGlrTrfiGLhpojPEssV3GfBIzKiCd0VMxQmoEll2oIjJ\n+8JBM0XOdRtK80gb1oezAdOI1h4mjRfYUp95c=\n-----END OPENSSH PRIVATE KEY-----","tunnel-private-key-passphrase":"mysecretpassword","advanced-options":False},"name":"postgres-other-ssh","engine":"postgres"}
# postgres_ssh_3 = {"is_on_demand":False,"is_full_sync":True,"is_sample":False,"cache_ttl":None,"refingerprint":False,"auto_run_queries":True,"schedules":{},"details":{"host":"postgres-app-db","port":5432,"dbname":"metabase","user":"metabase","password":"mysecretpassword","schema-filters-type":"all","ssl":False,"tunnel-enabled":True,"tunnel-host":"ssh-choke","tunnel-port":2222,"tunnel-user":"metabase","tunnel-auth-option":"ssh-key","tunnel-private-key":"-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABCUUjov89\na69l0fjxRMPj45AAAAEAAAAAEAAAAzAAAAC3NzaC1lZDI1NTE5AAAAINaVvzSukjVtGgdg\n7ejckHZ8PbbMif9lqk7Ws+1excxJAAAAoCQiHwFoeVomvkBtGlh+hQWleLNXTc3spMmzHA\niE4Pt00S3XIw2bhjISY/sasSNnSTPULujlBY3UbnCbR7BzHilmf43Q7/Bc575GutTJ0cnc\n7t6EAPhSl7lX7kXgLiHIf8RGrQuGlrTrfiGLhpojPEssV3GfBIzKiCd0VMxQmoEll2oIjJ\n+8JBM0XOdRtK80gb1oezAdOI1h4mjRfYUp95c=\n-----END OPENSSH PRIVATE KEY-----","tunnel-private-key-passphrase":"mysecretpassword","advanced-options":False},"name":"postgres-app-db-ssh","engine":"postgres"}

dbs = [pg_sample_15, app_db, postgres_big]

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