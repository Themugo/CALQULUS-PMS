#!/usr/bin/env python3
"""Read-only migration inventory (Phase 2D). Parses supabase/migrations/*.sql; never touches a database.

Usage: python3 -I scripts/phase2d-migration-inventory.py <repo_root> <out_json>
Statement splitting understands single quotes, dollar quoting and comments. Object extraction is
regex-based static analysis: it finds statement *shapes*, it does not prove behaviour.
"""
import sys, os, re, json, hashlib, collections

root, out = sys.argv[1], sys.argv[2]
mdir = os.path.join(root, 'supabase', 'migrations')
CLI_RE = re.compile(r'^(\d+)_.*\.sql$')

def strip_and_split(sql):
    """Return list of statements with comments removed (dollar-quoted bodies kept intact)."""
    stmts, buf, i, n = [], [], 0, len(sql)
    while i < n:
        c = sql[i]
        if sql.startswith('--', i):
            j = sql.find('\n', i); i = n if j < 0 else j; continue
        if sql.startswith('/*', i):
            j = sql.find('*/', i + 2); i = n if j < 0 else j + 2; continue
        if c == "'":
            j = i + 1
            while j < n:
                if sql[j] == "'":
                    if j + 1 < n and sql[j + 1] == "'": j += 2; continue
                    break
                j += 1
            buf.append(sql[i:j + 1]); i = j + 1; continue
        if c == '$':
            m = re.match(r'\$[A-Za-z_]*\$', sql[i:])
            if m:
                tag = m.group(0); j = sql.find(tag, i + len(tag))
                j = n if j < 0 else j + len(tag)
                buf.append(sql[i:j]); i = j; continue
        if c == ';':
            s = ''.join(buf).strip()
            if s: stmts.append(s)
            buf = []; i += 1; continue
        buf.append(c); i += 1
    s = ''.join(buf).strip()
    if s: stmts.append(s)
    return stmts

NAME = r'((?:"[^"]+"|[A-Za-z_][\w$]*)(?:\s*\.\s*(?:"[^"]+"|[A-Za-z_][\w$]*))?)'
def nm(x): return re.sub(r'\s+', '', x).replace('"', '').lower()
def qual(x):
    x = nm(x); return x if '.' in x else 'public.' + x

PAT = {
 'create_table': re.compile(r'^create\s+(?:unlogged\s+|temp(?:orary)?\s+)?table\s+(?:if\s+not\s+exists\s+)?' + NAME, re.I),
 'create_function': re.compile(r'^create\s+(?:or\s+replace\s+)?function\s+' + NAME + r'\s*\(', re.I),
 'create_view': re.compile(r'^create\s+(?:or\s+replace\s+)?(?:materialized\s+)?view\s+' + NAME, re.I),
 'create_type': re.compile(r'^create\s+type\s+' + NAME, re.I),
 'create_index': re.compile(r'^create\s+(unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?' + NAME + r'?\s*on\s+(?:only\s+)?' + NAME, re.I),
 'create_trigger': re.compile(r'^create\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\s+' + NAME + r'.*?\bon\s+' + NAME, re.I | re.S),
 'create_policy': re.compile(r'^create\s+policy\s+("[^"]+"|[\w$]+)\s+on\s+' + NAME, re.I),
 'create_ext': re.compile(r'^create\s+extension\s+(?:if\s+not\s+exists\s+)?"?([\w-]+)"?', re.I),
 'create_schema': re.compile(r'^create\s+schema\s+(?:if\s+not\s+exists\s+)?' + NAME, re.I),
 'alter_table': re.compile(r'^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?' + NAME + r'\s+(.*)$', re.I | re.S),
 'alter_function': re.compile(r'^alter\s+function\s+' + NAME, re.I),
 'drop': re.compile(r'^drop\s+(table|function|policy|trigger|index|view|type|materialized\s+view|schema|extension|constraint)\s+(if\s+exists\s+)?(.*)$', re.I | re.S),
 'truncate': re.compile(r'^truncate\b', re.I),
 'delete': re.compile(r'^delete\s+from\s+' + NAME, re.I),
 'update': re.compile(r'^update\s+(?:only\s+)?' + NAME, re.I),
 'insert': re.compile(r'^insert\s+into\s+' + NAME, re.I),
 'grant': re.compile(r'^grant\b', re.I),
 'revoke': re.compile(r'^revoke\b', re.I),
 'comment': re.compile(r'^comment\s+on\b', re.I),
}

def fn_signature(stmt):
    m = re.match(r'^create\s+(?:or\s+replace\s+)?function\s+' + NAME + r'\s*\(', stmt, re.I)
    name = qual(m.group(1)); i = m.end(); depth = 1; j = i
    while j < len(stmt) and depth:
        if stmt[j] == '(': depth += 1
        elif stmt[j] == ')': depth -= 1
        j += 1
    args = stmt[i:j - 1]
    # input arg types only (drop names/defaults/OUT)
    types = []
    for a in re.split(r',(?![^()]*\))', args):
        a = a.strip()
        if not a or re.match(r'^out\b', a, re.I): continue
        a = re.sub(r'\s+default\s+.*$|\s*=\s*.*$', '', a, flags=re.I | re.S)
        a = re.sub(r'^(?:in|inout|variadic)\s+', '', a, flags=re.I)
        parts = a.split()
        t = ' '.join(parts[1:]) if len(parts) > 1 else parts[0]
        types.append(re.sub(r'\s+', ' ', t.lower()))
    rm = re.search(r'\)\s*returns\s+(setof\s+)?(table\s*\(.*?\)|[\w.\[\]" ]+?)\s+(?:language|as|security|stable|volatile|immutable|set|strict|parallel|cost|rows|\$)', stmt[j - 1:], re.I | re.S)
    ret = re.sub(r'\s+', ' ', ((rm.group(1) or '') + rm.group(2)).lower()) if rm else '?'
    sd = bool(re.search(r'security\s+definer', stmt, re.I))
    sp = bool(re.search(r'\bset\s+search_path\b', stmt, re.I))
    return name, '(' + ','.join(types) + ')', ret, sd, sp

files = sorted(f for f in os.listdir(mdir) if f.endswith('.sql'))
rows = []
for f in files:
    raw = open(os.path.join(mdir, f), 'rb').read()
    sql = raw.decode('utf-8', 'replace')
    m = re.match(r'^(\d+)', f)
    version = m.group(1) if m else ''
    r = dict(file=f, version=version, cli_matches=bool(CLI_RE.match(f)), bytes=len(raw),
             sha256=hashlib.sha256(raw).hexdigest(), lines=sql.count('\n') + 1,
             creates=collections.defaultdict(list), alters=[], drops=[], data_ops=[], grants=0, revokes=0,
             functions=[], flags=[])
    stmts = strip_and_split(sql)
    r['statements'] = len(stmts)
    for s in stmts:
        head = re.sub(r'\s+', ' ', s[:200])
        if PAT['create_function'].match(s):
            try:
                name, args, ret, sd, sp = fn_signature(s)
                r['functions'].append(dict(name=name, args=args, returns=ret, security_definer=sd, search_path_set=sp))
                r['creates']['function'].append(name + args)
            except Exception:
                r['creates']['function'].append('?' + head)
            continue
        hit = False
        for key in ('create_table', 'create_view', 'create_type', 'create_schema'):
            mm = PAT[key].match(s)
            if mm: r['creates'][key.split('_')[1]].append(qual(mm.group(1))); hit = True; break
        if hit: continue
        mm = PAT['create_index'].match(s)
        if mm: r['creates']['unique_index' if mm.group(1) else 'index'].append(qual(mm.group(3)) if mm.group(3) else '?'); continue
        mm = PAT['create_trigger'].match(s)
        if mm: r['creates']['trigger'].append(nm(mm.group(1)) + ' on ' + qual(mm.group(2))); continue
        mm = PAT['create_policy'].match(s)
        if mm: r['creates']['policy'].append(mm.group(1).strip('"') + ' on ' + qual(mm.group(2))); continue
        mm = PAT['create_ext'].match(s)
        if mm: r['creates']['extension'].append(mm.group(1)); continue
        mm = PAT['alter_table'].match(s)
        if mm:
            tail = re.sub(r'\s+', ' ', mm.group(2))[:120]
            r['alters'].append(qual(mm.group(1)) + ': ' + tail)
            if re.search(r'\bdrop\s+column\b', tail, re.I): r['flags'].append('DROP_COLUMN')
            if re.search(r'\btype\b', tail, re.I) and re.search(r'alter\s+column', tail, re.I): r['flags'].append('ALTER_COLUMN_TYPE')
            if re.search(r'set\s+not\s+null', tail, re.I): r['flags'].append('SET_NOT_NULL(data-dependent)')
            if re.search(r'add\s+constraint|add\s+(?:primary|foreign|unique|check)', tail, re.I): r['flags'].append('ADD_CONSTRAINT(data-dependent)')
            if re.search(r'rename', tail, re.I): r['flags'].append('RENAME')
            continue
        if PAT['alter_function'].match(s): r['alters'].append('function: ' + head[:100]); continue
        mm = PAT['drop'].match(s)
        if mm:
            kind = mm.group(1).lower(); r['drops'].append(kind + ' ' + re.sub(r'\s+', ' ', mm.group(3))[:80])
            if kind in ('table', 'schema', 'type', 'materialized view', 'view', 'extension'): r['flags'].append('DROP_' + kind.upper().replace(' ', '_'))
            continue
        if PAT['truncate'].match(s): r['data_ops'].append('truncate'); r['flags'].append('TRUNCATE'); continue
        mm = PAT['delete'].match(s)
        if mm: r['data_ops'].append('delete ' + qual(mm.group(1))); r['flags'].append('DELETE_DATA'); continue
        mm = PAT['update'].match(s)
        if mm and not re.match(r'^update\s+set', s, re.I): r['data_ops'].append('update ' + qual(mm.group(1))); r['flags'].append('UPDATE_DATA(backfill)'); continue
        mm = PAT['insert'].match(s)
        if mm: r['data_ops'].append('insert ' + qual(mm.group(1))); r['flags'].append('INSERT_DATA(seed/backfill)'); continue
        if PAT['grant'].match(s): r['grants'] += 1; continue
        if PAT['revoke'].match(s): r['revokes'] += 1; continue
    r['creates'] = {k: v for k, v in r['creates'].items()}
    uidx = r['creates'].get('unique_index', [])
    if uidx: r['flags'].append('UNIQUE_INDEX(data-dependent)')
    low = sql.lower()
    r['idempotent_markers'] = bool(re.search(r'if\s+not\s+exists|or\s+replace|drop\s+\w+\s+if\s+exists', low))
    r['uses_cron_or_net'] = bool(re.search(r'\bcron\.|\bnet\.http', low))
    r['touches_auth_schema'] = bool(re.search(r'\bauth\.users', low))
    r['flags'] = sorted(set(r['flags']))
    r['destructive'] = any(x.startswith(('DROP_', 'TRUNCATE', 'DELETE_DATA')) for x in r['flags'])
    r['data_dependent'] = any('data-dependent' in x or 'backfill' in x or 'seed' in x for x in r['flags'])
    rows.append(r)

# duplicate groups (by numeric prefix; includes non-CLI-matching names)
by_ver = collections.defaultdict(list)
for r in rows:
    if r['version']: by_ver[r['version']].append(r['file'])
dup = {v: fs for v, fs in by_ver.items() if len(fs) > 1}
# also group non-matching names with the base version they extend (e.g. 20260506000022b -> ...22)
for r in rows:
    m = re.match(r'^(\d+)[A-Za-z]+_', r['file'])
    if m: dup.setdefault(m.group(1), [])
for r in rows:
    m = re.match(r'^(\d+)[A-Za-z]+_', r['file'])
    if m and r['file'] not in dup[m.group(1)]: dup[m.group(1)].append(r['file'])
for v in dup:
    base = [f for f in by_ver.get(v, []) if f not in dup[v]]
    dup[v] = sorted(set(dup[v] + base))
groups = {v: fs for v, fs in sorted(dup.items()) if len(fs) > 1}
gid = {}
for i, (v, fs) in enumerate(groups.items(), 1):
    for f in fs: gid[f] = i
for r in rows: r['duplicate_group'] = gid.get(r['file'], 0)

# function signature collisions across files
sigs = collections.defaultdict(list)
for r in rows:
    for fn in r['functions']: sigs[(fn['name'], fn['args'])].append((r['file'], fn['returns']))
collisions = []
for (n, a), lst in sigs.items():
    files_ = sorted({f for f, _ in lst}); rets = {rt for _, rt in lst}
    if len(rets) > 1: collisions.append(dict(function=n + a, kind='RETURN_TYPE_CONFLICT', definitions=lst))
json.dump(dict(migrations=rows, duplicate_groups=groups, return_type_conflicts=collisions,
               totals=dict(sql_files=len(rows), cli_matching=sum(r['cli_matches'] for r in rows),
                           non_cli=sum(not r['cli_matches'] for r in rows), duplicate_groups=len(groups))),
          open(out, 'w'), indent=1)
print(f"files={len(rows)} cli_matching={sum(r['cli_matches'] for r in rows)} non_cli={sum(not r['cli_matches'] for r in rows)} dup_groups={len(groups)} return_type_conflicts={len(collisions)}")
