#!/usr/bin/env python3
"""Fetch official CEC results (data.gov.il CKAN datastore, dataset votes-knesset) into $GEO_RAW.
Usage: python3 tools/fetch_geo.py 25   (no API key needed; raw files stay outside the repo)
To add a new election: add its (ballot, city) resource ids to R once published on data.gov.il."""
import json,urllib.request,hashlib,sys,os,datetime
R={'21':('f79f9ba5-fe12-4b90-96cc-916f1b7c1c34','1a1c7b2b-e819-4ba9-b159-d68e3566c58b'),
'22':('22f3a195-3a79-436c-be23-cb606bc7b398','bd22cd14-138c-4917-931a-ef628c2a5a30'),
'23':('3b9e911a-2e90-4587-b209-84171664056b','3dc36e20-25d6-4496-ba6a-71d9bc917349'),
'24':('419be3b0-fd30-455a-afc0-034ec36be990','9921a347-8466-4ef4-81f9-22523c5c4632'),
'25':('cc223336-07bc-485d-b160-62df92967c0a','b392b8ee-ba45-4ea0-bfed-f03a1a36e99c')}
k=sys.argv[1]
os.makedirs(os.environ.get('GEO_RAW','/workspace/geo/raw'),exist_ok=True); os.chdir(os.environ.get('GEO_RAW','/workspace/geo/raw'))
for kind,rid in zip(('ballot','city'),R[k]):
  fn=f'k{k}_{kind}.json'
  if os.path.exists(fn): continue
  recs=[];off=0;fields=None
  while True:
    u=f'https://data.gov.il/api/3/action/datastore_search?resource_id={rid}&limit=32000&offset={off}'
    d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=120))['result']
    fields=fields or [f['id'] for f in d['fields']]
    recs+=d['records'];off+=len(d['records'])
    if not d['records'] or off>=d['total']: break
  b=json.dumps({'resource_id':rid,'retrieved':datetime.date.today().isoformat(),'fields':fields,'records':recs},ensure_ascii=False).encode()
  open(fn,'wb').write(b);print(fn,len(recs),len(b),hashlib.sha256(b).hexdigest())
