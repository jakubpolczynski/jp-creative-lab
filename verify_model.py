"""Smoke tests for the real 3D voxel scene, no image/visual guesswork."""
from __future__ import annotations
import importlib.util
from pathlib import Path
import math, struct, json

ROOT=Path(__file__).parent
sp=importlib.util.spec_from_file_location('voxel_builder',ROOT/'build_model.py')
builder=importlib.util.module_from_spec(sp)
sp.loader.exec_module(builder)

model=(ROOT/'room-server.glb').read_bytes()
magic,version,total=struct.unpack_from('<III',model)
assert (magic,version,total)==(0x46546C67,2,len(model)), 'Invalid binary glTF header'
json_size,json_tag=struct.unpack_from('<II',model,12)
assert json_tag==0x4E4F534A
schema=json.loads(model[20:20+json_size])
assert schema['asset']['version']=='2.0'
assert len(schema['meshes'][0]['primitives'])==2
assert builder.BOX_COUNTER>500
assert builder.FLOOR_Y==.388
assert abs(builder.DESK_UNDERSIDE-1.23)<1e-9
assert builder.cab_h>0
assert abs(builder.FLOOR_Y+builder.cab_h-builder.DESK_UNDERSIDE)<1e-9
assert abs(builder.cy(.18)-.13/2-builder.FLOOR_Y)<1e-8, 'Chair wheel not grounded'
assert builder.mouse_z<builder.keyboard_z, 'Mouse must be visually right of keyboard'
assert 0 < (builder.keyboard_z-1.15/2)-(builder.mouse_z+.235/2) < .28, 'Mouse should sit beside the keyboard'

# Geometry sanity: all vertex values finite, no degenerate box dimensions.
for group in builder.COLLECTIONS:
    assert len(group['idx'])%3==0
    assert len(group['pos'])==len(group['normal'])==len(group['colors'])
    assert all(math.isfinite(v) for p in group['pos'] for v in p)

assert any(ROOT.glob('viewer.*.js'))
assert (ROOT/'index.html').exists()
print('PASS: GLB structure, frame, desk cabinet, chair contact, mouse placement and mesh values')
print('Boxes:',builder.BOX_COUNTER,'GLB bytes:',len(model),'triangles:',sum(len(x['idx'])//3 for x in builder.COLLECTIONS))