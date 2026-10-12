import sys,json,subprocess,datetime,pathlib
root=pathlib.Path(__file__).parent
counter=root/'tool-count.txt'
n=int(counter.read_text()) if counter.exists() else 125
n+=3
counter.write_text(str(n))
t0=datetime.datetime.now(datetime.timezone.utc).isoformat()
r=subprocess.run(['tools/drive.sh','41423',sys.argv[1]],capture_output=True,text=True)
t1=datetime.datetime.now(datetime.timezone.utc).isoformat()
with (root/'operations.jsonl').open('a') as f: f.write(json.dumps({'count_upper':n,'start':t0,'end':t1,'op':json.loads(sys.argv[1]),'response':r.stdout,'stderr':r.stderr,'exit':r.returncode})+'\n')
print(r.stdout)
print('tool count upper:',n,'UTC tool end:',t1)
