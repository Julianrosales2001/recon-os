#!/usr/bin/env python3
"""Refresh sfx.json from the sound files in this folder.

Drop a file named after a slot next to this script (aux.open.wav, key.mp3, scan.ping.m4a ...),
then run it before you commit:

    python3 v2/sfx/build.py

Volumes you set by hand in sfx.json ("vol": {"aux.open": 0.8}) are kept.
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
EXTS = ['.wav', '.m4a', '.mp3', '.aac', '.caf']          # first match wins if a slot has more than one
SLOTS = ['key', 'jog', 'mark', 'file', 'ok', 'err', 'thunk',
         'drum.roll', 'drum.press', 'fn.open', 'fn.close',
         'aux.latch', 'aux.open', 'aux.close', 'aux.keyup', 'aux.lamp',
         'scan.ping', 'scan.found', 'scan.empty', 'here.fix',
         'ring.pick', 'ring.file', 'gps.lock', 'visit', 'boot']
# the stock files are normalised; these are the levels the RP has always played them at
STOCK_VOL = {'err': 0.0464, 'file': 0.0481, 'jog': 0.0211, 'key': 0.0379, 'mark': 0.0561, 'ok': 0.0435, 'thunk': 0.2018}


def audio_files(folder):
    out = {}
    if not os.path.isdir(folder):
        return out
    for f in sorted(os.listdir(folder)):
        p = os.path.join(folder, f)
        name, ext = os.path.splitext(f)
        if not os.path.isfile(p) or ext.lower() not in EXTS or f.startswith('.'):
            continue
        if name in out and EXTS.index(ext.lower()) >= EXTS.index(os.path.splitext(out[name])[1].lower()):
            continue
        out[name] = f
    return out


def main():
    path = os.path.join(HERE, 'sfx.json')
    old = {}
    if os.path.exists(path):
        try:
            old = json.load(open(path))
        except ValueError:
            print('sfx.json was not valid JSON; rebuilding it')
    stock = {k: 'stock/' + f for k, f in audio_files(os.path.join(HERE, 'stock')).items()}
    custom = audio_files(HERE)
    unknown = sorted(k for k in custom if k not in SLOTS)
    for k in unknown:
        del custom[k]
    out = {
        'v': int(time.time()),
        'stock': stock,
        'stockVol': {k: v for k, v in STOCK_VOL.items() if k in stock},
        'custom': custom,
        'vol': old.get('vol', {}),
    }
    with open(path, 'w') as fh:
        json.dump(out, fh, indent=2)
        fh.write('\n')
    print('sfx.json · %d stock · %d yours' % (len(stock), len(custom)))
    for k in SLOTS:
        if k in custom:
            print('  %-11s %s' % (k, custom[k]))
    for k in unknown:
        print('  ?? %s is not a slot name (see README.md) — left out' % k)
    return 0


if __name__ == '__main__':
    sys.exit(main())
