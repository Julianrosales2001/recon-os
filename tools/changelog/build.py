#!/usr/bin/env python3
"""RECON.OS CHANGELOG · rebuilds changelog/ from git history.

Run from anywhere:   python3 tools/changelog/build.py
Every version (2.8, 2.9 … 2.42) gets a page: when it shipped, what changed (from the commit
messages), how much code moved against the version before it, and a link to the exact snapshot
of the whole repo at that version on GitHub. Everything before version numbers started is
grouped into eras. Nothing outside changelog/ is touched.
"""
import os, re, subprocess, html
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(REPO, 'changelog')
GH = 'https://github.com/Julianrosales2001/recon-os'

def git(*a):
    return subprocess.run(['git', '-C', REPO] + list(a), capture_output=True, text=True).stdout

commits = []
for line in git('log', '--reverse', '--format=%h\x1f%ad\x1f%s', '--date=short').splitlines():
    h, d, s = line.split('\x1f', 2)
    commits.append({'h': h, 'd': d, 's': s})
first_v2 = (git('log', '--reverse', '--format=%h', '--', 'v2').split() or [None])[0]
VER = re.compile(r',\s*(\d+)\.(\d+)(?:\.(\d+))?\s*$')

# group: eras before version numbers, then one group per minor version (2.35 holds 2.35.0, 2.35.1 …)
# the RP is 2.x; the XP-1000 laptop console counts its own 1.x releases
groups, byk, cur, seen_v2 = [], {}, None, False
def grp(key, kind, prod):
    if key not in byk: byk[key] = {'key': key, 'kind': kind, 'prod': prod, 'commits': []}; groups.append(byk[key])
    return byk[key]
for c in commits:
    if c['h'] == first_v2: seen_v2 = True
    m = VER.search(c['s'])
    if m:
        prod = 'XP' if m.group(1) == '1' else 'RP'
        g = grp(('xp-v' if prod == 'XP' else 'v') + m.group(1) + '.' + m.group(2), 'ver', prod)
        if prod == 'RP': cur = g
    elif cur is None or cur['kind'] == 'era':
        g = cur = grp('v2-early' if seen_v2 else 'v1', 'era', 'RP')
    else:
        g = cur   # an unnumbered commit (a sound drop, say) belongs to the release it landed in
    c['v'] = '.'.join(x for x in m.groups() if x) if m else None
    g['commits'].append(c)

ERA = {'v1': ('v1 · the Leaflet PWA', 'The first RECON.OS: a Leaflet map PWA with fog of war, marks, regions, objectives and the Y2K skin.'),
       'v2-early': ('v2 early · RX-90 dot-matrix rebuild', 'The rebuild as a physical device: the dot-matrix VFD, the STN LCD and the amber clock, before releases were numbered.')}

def clean(s):
    s = VER.sub('', s)
    s = re.sub(r'^(feat|fix|tweak|chore|refactor)(\([^)]*\))?:\s*', '', s, flags=re.I)
    return s.strip()
def kind(s):
    m = re.match(r'^(feat|fix|tweak)', s, re.I)
    return m.group(1).lower() if m else 'change'

EMPTY = '4b825dc642cb6eb9a060e54bf8d69288fbee4904'   # git's empty tree: the "before" of the very first release
def stat(a, b):
    raw = git('diff', '--shortstat', (a or EMPTY) + '..' + b)
    f = re.search(r'(\d+) files? changed', raw); i = re.search(r'(\d+) insertions?', raw); d = re.search(r'(\d+) deletions?', raw)
    return int(f.group(1)) if f else 0, int(i.group(1)) if i else 0, int(d.group(1)) if d else 0
def files(a, b, n=12):
    rows = []
    for line in git('diff', '--numstat', (a or EMPTY) + '..' + b).splitlines():
        p = line.split('\t')
        if len(p) == 3 and p[0] != '-': rows.append((int(p[0]) + int(p[1]), p[2]))
    rows.sort(reverse=True)
    return rows[:n]

os.makedirs(OUT, exist_ok=True)
index = []
prev = {}
for g in groups:
    cs = g['commits']; last = cs[-1]['h']; first = cs[0]
    prev_last = prev.get(g['prod']) or (first['h'] + '^' if groups.index(g) else None)   # a product's first release: against the commit before it
    nf, ins, dels = stat(prev_last, last)
    if g['kind'] == 'ver':
        name = g['key']; title = ('XP-1000 ' if g['prod'] == 'XP' else '') + g['key'].replace('xp-', '')
        head = next((clean(c['s']) for c in cs if kind(c['s']) == 'feat'), clean(cs[0]['s']))
        blurb = ''
    else:
        name = g['key']; title, blurb = ERA[g['key']]; head = blurb
    dates = first['d'] if first['d'] == cs[-1]['d'] else first['d'] + ' → ' + cs[-1]['d']
    L = ['# ' + title, '', '**Shipped:** ' + dates + '  ', '**Snapshot:** [the whole repo at this version](' + GH + '/tree/' + last + ')  ',
         '**Against the version before:** ' + str(nf) + ' files · +' + str(ins) + ' / −' + str(dels) + ' lines', '']
    if blurb: L += [blurb, '']
    for sec, label in (('feat', 'New'), ('tweak', 'Changed'), ('fix', 'Fixed'), ('change', 'Other')):
        items = [c for c in cs if kind(c['s']) == sec]
        if not items: continue
        L += ['## ' + label, '']
        for c in items:
            txt = clean(c['s'])
            parts = [p.strip() for p in re.split(r'\s+-\s+|;\s+', txt, maxsplit=1)]
            line = '- **' + parts[0] + '**' + (' · ' + parts[1] if len(parts) > 1 else '')
            L.append(line + '  `' + (c['v'] or c['h']) + '` · [' + c['h'] + '](' + GH + '/commit/' + c['h'] + ') · ' + c['d'])
        L.append('')
    fl = files(prev_last, last)
    if fl:
        L += ['## Where the code moved', '', '| lines changed | file |', '|---:|---|'] + ['| ' + str(n) + ' | `' + p + '` |' for n, p in fl] + ['']
    L += ['---', '', 'Compare with the version before: ' + (GH + '/compare/' + prev_last + '...' + last if prev_last else 'this is the first one') + '  ',
          'Open this exact version locally: `git checkout ' + last + '` (then `git checkout main` to come back)', '']
    open(os.path.join(OUT, name + '.md'), 'w').write('\n'.join(L))
    index.append((name, title, dates, head, ins, dels, len(cs)))
    prev[g['prod']] = last

R = ['# RECON.OS · CHANGELOG', '',
     'One page per release, newest first: what shipped, how much code moved against the release before it, and a link to the exact snapshot of the repo at that release.', '',
     'Rebuilt from git by `python3 tools/changelog/build.py`. Run it after a release (it only writes this folder), then commit `changelog/`.', '',
     '| release | shipped | headline | lines | commits |', '|---|---|---|---:|---:|']
for name, title, dates, head, ins, dels, n in reversed(index):
    h = head if len(head) <= 110 else head[:107].rsplit(' ', 1)[0] + '…'
    R.append('| [' + title.split(' · ')[0] + '](' + name + '.md) | ' + dates.split(' → ')[-1] + ' | ' + h.replace('|', '/') + ' | +' + str(ins) + ' / −' + str(dels) + ' | ' + str(n) + ' |')
R += ['', '_' + str(len(commits)) + ' commits in all._', '']
open(os.path.join(OUT, 'README.md'), 'w').write('\n'.join(R))
print('changelog: ' + str(len(index)) + ' pages from ' + str(len(commits)) + ' commits')
