"""Sequential paired executable benchmark; no concurrent owned builds or probes."""
import hashlib
import json
import os
from pathlib import Path
import resource
import subprocess
import time

out = Path('target/cut285')
receipts = []
for repeat in range(1, 4):
    for variant in (['before', 'after'] if repeat % 2 else ['after', 'before']):
        name = f'{variant}-r{repeat}'
        packet = out / f'{name}.json'
        assert not packet.exists(), f'Immutable measurement already exists: {packet}'
        binary = out / f'probe-{variant}'
        argv = [str(binary), '--seeds', '1,2', '--bots', 'PICKED,TUNED',
                '--days', '14', '--until-depth', '33', '--threads', '8', '--out', str(packet)]
        previous = resource.getrusage(resource.RUSAGE_CHILDREN)
        started = time.monotonic()
        with (out / f'{name}.log').open('wb') as log:
            result = subprocess.run(argv, stdout=log, stderr=subprocess.STDOUT, check=False)
        elapsed = time.monotonic() - started
        usage = resource.getrusage(resource.RUSAGE_CHILDREN)
        receipt = dict(name=name, argv=argv, exit=result.returncode, wall_seconds=elapsed,
                       cpu_seconds=usage.ru_utime+usage.ru_stime-previous.ru_utime-previous.ru_stime,
                       executable_sha256=hashlib.sha256(binary.read_bytes()).hexdigest(),
                       load_average=os.getloadavg())
        receipts.append(receipt)
        (out / 'timings.json').write_text(json.dumps(receipts, indent=2)+'\n')
        print(json.dumps(receipt), flush=True)
        assert result.returncode == 0
