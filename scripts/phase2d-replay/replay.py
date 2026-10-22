import sys, os, re, json, subprocess, time
mode, mdir, outp = sys.argv[1], sys.argv[2], sys.argv[3]
inv = json.load(open('inv.json'))
PSQL = ['psql', '-h', '/var/tmp', '-p', '55432', '-U', 'postgres', '-X', '-q']
def sh(args, **kw): return subprocess.run(args, capture_output=True, text=True, **kw)
db = 'replay_' + mode.lower()
sh(PSQL + ['-d', 'postgres', '-c', f'DROP DATABASE IF EXISTS {db}'])
r = sh(PSQL + ['-d', 'postgres', '-c', f'CREATE DATABASE {db} TEMPLATE stubtpl']); assert r.returncode == 0, r.stderr
rows = inv['migrations']; byname = {r['file']: r for r in rows}
cli = sorted([r for r in rows if r['cli_matches']], key=lambda r: (r['version'], r['file']))
if mode == 'CLI_STRICT':   # CLI-recognised files in order; stop at first duplicate version (assumed CLI abort) or first failure
    order, stop_on_fail, skip_dupes = cli, True, False
elif mode == 'CLI_CONTINUE':  # first file per version only; continue after failures
    seen, order = set(), []
    for r in cli:
        if r['version'] in seen: continue
        seen.add(r['version']); order.append(r)
    stop_on_fail, skip_dupes = False, True
elif mode == 'LEXICAL_ALL':  # every .sql file by filename, continue after failures
    order, stop_on_fail, skip_dupes = sorted(rows, key=lambda r: r['file']), False, False
res, seen = [], set()
for r in order:
    if mode == 'CLI_STRICT' and r['version'] in seen:
        res.append(dict(file=r['file'], status='STOPPED_DUPLICATE_VERSION', error='CLI inserts schema_migrations(version) PK twice -> would abort (assumption, CLI not available)')); break
    seen.add(r['version'])
    t = time.time()
    p = sh(PSQL + ['-d', db, '-v', 'ON_ERROR_STOP=1', '-1', '-f', os.path.join(mdir, r['file'])])
    err = ''
    if p.returncode != 0:
        lines = [l for l in p.stderr.splitlines() if 'ERROR' in l or l.startswith('LINE') or 'DETAIL' in l or 'HINT' in l]
        err = ' | '.join(lines[:3])[:400]
    res.append(dict(file=r['file'], status='PASS' if p.returncode == 0 else 'FAIL', error=err, secs=round(time.time() - t, 2)))
    if p.returncode != 0 and stop_on_fail: break
json.dump(dict(mode=mode, results=res), open(outp, 'w'), indent=1)
c = {}
for x in res: c[x['status']] = c.get(x['status'], 0) + 1
print(mode, len(res), 'files attempted', c)
