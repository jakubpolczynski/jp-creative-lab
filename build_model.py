#!/usr/bin/env python3
"""Generate a standalone, real, isometric voxel scene as glTF 2.0 GLB.
Geometry is generated from discrete 3D cuboids, not extracted from a raster image.
Copyright (c) 2026. Scene inspired by the user-supplied design reference.
"""
from __future__ import annotations
import json, math, struct, pathlib
import numpy as np

ROOT=pathlib.Path(__file__).parent
# Two separate primitives (opaque and self-illuminated voxel surfaces).
COLLECTIONS=[{'pos':[], 'normal':[], 'colors':[], 'idx':[], 'signal':[], 'rack':[], 'room':[], 'button':[], 'chair':[]} for _ in range(2)]
BOX_COUNTER=0
RACK_ACTIVE=False
ROOM_ACTIVE=False
ROOM_GEOMETRY=False
CHAIR_ACTIVE=False

def rgb(color):
    color=color.lstrip('#'); return tuple(int(color[i:i+2],16) for i in (0,2,4))

def tint(color,factor):
    return tuple(min(255,max(0,int(round(v*factor)))) for v in rgb(color))

# Corner coordinates follow x horizontal, y vertical, z depth. Flat outward face normals.
faces=[
  (( 1, 0, 0),(1,5,6,2),0.94), # +X
  ((-1, 0, 0),(4,0,3,7),0.72), # -X
  (( 0, 1, 0),(3,2,6,7),1.13), # +Y
  (( 0,-1, 0),(4,5,1,0),0.67), # -Y
  (( 0, 0, 1),(5,4,7,6),0.89), # +Z
  (( 0, 0,-1),(0,1,2,3),0.79), # -Z
]

def box(x,y,z,w,h,d,color,emission=False,shade=True,signal=None):
    global BOX_COUNTER
    if min(w,h,d)<=0: raise ValueError('Invalid box size')
    BOX_COUNTER+=1
    if RACK_ACTIVE and emission:
        color='#59ff89'
    p=COLLECTIONS[bool(emission)]
    xmin,xmax=x-w/2,x+w/2; ymin,ymax=y-h/2,y+h/2; zmin,zmax=z-d/2,z+d/2
    corners=[(xmin,ymin,zmin),(xmax,ymin,zmin),(xmax,ymax,zmin),(xmin,ymax,zmin),
             (xmin,ymin,zmax),(xmax,ymin,zmax),(xmax,ymax,zmax),(xmin,ymax,zmax)]
    for normal,inds,factor in faces:
        start=len(p['pos'])
        p['pos'].extend([corners[i] for i in inds]);p['normal'].extend([normal]*4)
        p['rack'].extend([float(RACK_ACTIVE and emission)]*4)
        p['room'].extend([float(ROOM_ACTIVE and emission)]*4)
        p['chair'].extend([float(CHAIR_ACTIVE)]*4)
        # The external cable flexes continuously from the fixed rack to the room.
        p['button'].extend([1.0 if ROOM_GEOMETRY else 0.0 if RACK_ACTIVE else max(0.0,min(1.0,(corners[i][0]+2.20)/3.74)) for i in inds])
        for i in inds:
            p['signal'].append(-100.0 if signal is None else signal(corners[i]))
        color_face=tint(color,factor if shade and not emission else 1.0)
        p['colors'].extend([color_face+(255,)]*4)
        p['idx'].extend([start,start+1,start+2,start,start+2,start+3])

def surface_x(x,y,z,w,h,color,emission=False): # flat front-facing +x surface; w runs across z
    box(x,y,z,.024,h,w,color,emission)

def surface_z(z,y,x,w,h,color,emission=False): # flat front-facing +z; width runs across x
    box(x,y,z,w,h,.024,color,emission)

def stud(x,y,z,s=.12,color='#7688bd'):
    box(x,y,z,s,s,s,color)

# pixel alphabet on vertical faces, rendered as real voxel geometry
GLYPH={
'A':['01110','10001','11111','10001','10001'],
'S':['01111','10000','01110','00001','11110'],
'C':['01111','10000','10000','10000','01111'],
'I':['11111','00100','00100','00100','11111'],
'R':['11110','10001','11110','10100','10010'],
'T':['11111','00100','00100','00100','00100'],
'J':['00111','00010','00010','10010','01100'],
'P':['11110','10001','11110','10000','10000'],
'>':['10000','01000','00100','01000','10000'],
'_':['00000','00000','00000','00000','11111']}

def pixel_text(face,x,y,z,text,scale=.07,color='#62eaff',emission=True):
    col=0
    for ch in text:
        bitmap=GLYPH.get(ch)
        if bitmap is None: col+=6;continue
        for row,line in enumerate(bitmap):
            for j,v in enumerate(line):
                if v=='1':
                    dx=(col+j)*scale; dy=(2-row)*scale
                    if face=='+x': box(x,y+dy,z-dx,0.028,scale*.87,scale*.87,color,emission)  # correct left-to-right reading on the isometric camera
                    else: box(x+dx,y+dy,z,scale*.87,scale*.87,0.028,color,emission)
        col+=6

def bracket(face,x,y,z,s=.45,color='#5cdfff'):
    # Four viewfinder corners, all actual cuboids
    if face=='+z':
        for sx in (-1,1):
            for sy in (-1,1):
                bx=x+sx*s;by=y+sy*s
                box(bx-sx*.09,by,z,.19,.035,.035,color,True)
                box(bx,by-sy*.09,z,.035,.19,.035,color,True)
    else:
        for sz in (-1,1):
            for sy in (-1,1):
                bz=z+sz*s;by=y+sy*s
                box(x,by,bz-sz*.09,.035,.035,.19,color,True)
                box(x,by-sy*.09,bz,.035,.19,.035,color,True)

# --- SERVER CORE / FLOATING PLINTH ---
RACK_ACTIVE=True
rx,rz=-4.8,.05
# Layered floating plinth / bevel blocks
box(rx,-.12,rz,3.65,.34,3.35,'#161f41')
box(rx,.10,rz,3.85,.24,3.55,'#5667a1')
box(rx,.24,rz,3.42,.12,3.14,'#292d59')
box(rx,-.29,rz,3.18,.11,2.93,'#111932')
for xx in (rx-1.67,rx+1.67):
    box(xx,.107,rz,.085,.11,3.26,'#50fc65',True)
for zz in (rz-1.53,rz+1.53):
    box(rx,.107,zz,3.53,.11,.085,'#4cff68',True)
for xx in (rx-1.7,rx+1.7):
    for zz in (rz-1.55,rz+1.55):
        box(xx,.29,zz,.43,.33,.43,'#8186cc')
        box(xx,.31,zz,.16,.13,.14,'#50fc72',True)
        box(xx,-.29,zz,.29,.21,.28,'#25325e')
# Feet
for dx in (-1.23,1.23):
    for dz in (-1.1,1.1):
        box(rx+dx,-.43,rz+dz,.34,.24,.34,'#1e294b')
# Server chassis
rack_base=.37; height=3.60
box(rx,rack_base+height/2,rz,2.52,height,2.35,'#192346')
box(rx,rack_base+height/2,rz,2.31,height-.20,2.17,'#273660')
# Face panels
surface_x(rx+1.28,2.06,rz,2.13,3.21,'#10182e')
surface_z(rz+1.19,2.10,rx,2.28,3.35,'#111a36')
# Rack top and floor layered
box(rx,.37,rz,2.72,.31,2.53,'#6774b0')
box(rx,3.98,rz,2.76,.30,2.59,'#7180c1')
box(rx,4.10,rz,2.45,.11,2.31,'#24365f')
# Corner armored rails
for dx in (-1.18,1.18):
    for dz in (-1.07,1.07):
        box(rx+dx,2.13,rz+dz,.29,3.68,.29,'#6b74b5')
        box(rx+dx,2.08,rz+dz,.08,3.25,.095,'#47ff79',True)
        for dy in (.0,3.70):
            stud(rx+dx,.40+dy,rz+dz,.29,'#8c8ce0')
# visible front unit slots on x-positive face
for i in range(7):
    yy=.77+i*.44
    surface_x(rx+1.309,yy,rz,1.94,.355,'#29385c')
    surface_x(rx+1.328,yy+.022,rz+.01,1.78,.257,'#0a1530')
    surface_x(rx+1.348,yy+.11,rz-.07,1.60,.045,'#3d5384')
    # matrix of LED strips on the slot
    for j in range(6):
        cz=rz-.68+j*.22
        surface_x(rx+1.37,yy-.055,cz,.15,.095,('#58ff69' if (j+i)%4 else '#4de5e9'),True)
    surface_x(rx+1.37,yy-.043,rz+.78,.07,.07,'#66fc74',True)
    surface_x(rx+1.37,yy-.043,rz+.92,.06,.06,'#59e9fa',True)
# Side panel +Z: Logo on side only, not room wall
surface_z(rz+1.207,2.18,rx,1.84,2.13,'#19254b')
bracket('+z',rx,2.19,rz+1.241,.61,'#66e7ff')
pixel_text('+z',rx-.37,2.19,rz+1.264,'JP',scale=.066,color='#68eaff')
# Under panel ventilation lines
for i in range(5):
    surface_z(rz+1.248,.85+i*.107,rx,.84,.038,'#09152a')
# Rail green vertical blades visible
for xx in (rx-1.23,rx+1.23):
    box(xx,2.03,rz+1.203,.065,3.14,.058,'#53ff72',True)
# server top crystal: pedestal and crystalline cube
box(rx,4.27,rz,1.79,.25,1.7,'#152647')
box(rx,4.41,rz,1.54,.13,1.47,'#4bf36c',True)
box(rx,4.60,rz,1.26,.46,1.25,'#193d42')
box(rx,4.89,rz,.99,.98,.98,'#2ac973',True)
box(rx,4.91,rz,.84,.81,.84,'#3ffb62',True)
# crystal edge rails
for dx in (-.50,.50):
    for dz in (-.50,.50):
        box(rx+dx,4.90,rz+dz,.035,1.05,.035,'#b1ffcc',True)
for dx in (-.50,.50):
    box(rx+dx,5.41,rz,.037,.035,1.05,'#b1ffcc',True)
for dz in (-.50,.50):
    box(rx,5.41,rz+dz,1.05,.035,.037,'#c1ffb8',True)

RACK_ACTIVE=False
# --- OFFICE MODULE: TWO CUTAWAY WALLS AND A FLOOR ---
ROOM_GEOMETRY=True
room_x0,room_x1=1.24,8.73
room_z0,room_z1=-3.20,3.28
room_x=(room_x0+room_x1)/2
room_z=(room_z0+room_z1)/2
# floating tile platform
box(room_x,-.075,room_z,7.72,.44,6.74,'#1a2448')
box(room_x,.115,room_z,7.77,.28,6.77,'#5b65a7')
box(room_x,.265,room_z,7.45,.12,6.48,'#34375d')
# underglow strips only near perimeter
ROOM_ACTIVE=True
for zz in (room_z0-.15,room_z1+.15):box(room_x,-.02,zz,7.58,.058,.08,'#4acbfc',True)
for xx in (room_x0-.17,room_x1+.17):box(xx,-.02,room_z,.08,.058,6.48,'#4ccaff',True)
ROOM_ACTIVE=False
# floor tile 10x9
nx,nz=10,9
for ix in range(nx):
    for iz in range(nz):
        sx=7.20/nx;sz=6.15/nz
        xx=room_x0+.16+(ix+.5)*sx
        zz=room_z0+.17+(iz+.5)*sz
        tile=('#6a6caf' if (ix*7+iz*3)%5 else '#7474bd')
        if (ix+iz)%7==0:tile='#626bac'
        box(xx,.356,zz,sx-.024,.064,sz-.024,tile)
# left and back room walls: front +X and +Z faces visible, third side entirely open.
wall_h=3.45
box(room_x0,2.075,room_z,.22,wall_h,6.70,'#393d71')
box(room_x,2.075,room_z0,.22+7.50,wall_h,.22,'#34385e')
# interior wall panels / panels for seams
for zz in np.arange(room_z0+.55,room_z1-.25,.92):
    surface_x(room_x0+.122,2.10,float(zz),.025,2.9,'#454676')
for xx in np.arange(room_x0+.7,room_x1-.4,.9):
    surface_z(room_z0+.125,2.1,float(xx),.03,2.9,'#474677')
# upper purple trims around both walls
box(room_x0,3.90,room_z,.31,.29,6.83,'#9592df')
box(room_x,3.90,room_z0,7.76,.29,.34,'#8884d9')
# far corner column and front ends
for zz in (room_z0,room_z1):box(room_x0,2.04,zz,.37,3.74,.36,'#777bc6')
for xx in (room_x0,room_x1):box(xx,2.04,room_z0,.38,3.74,.36,'#7777bf')
# side panel / base accent frame
box(room_x0,.50,room_z,.28,.21,6.66,'#8b86c9')
box(room_x,.50,room_z0,7.60,.21,.27,'#8783c5')
# Raised voxel neon on the back wall: preserve the requested spelling exactly.
WALL_NEON='ASCI ART'
box(room_x,2.14,room_z0+.16,7.0,3.12,.06,'#202543')
ROOM_ACTIVE=True
pixel_text('+z',1.795,3.00,room_z0+.21,'ASCI',.29,'#62eaff')
pixel_text('+z',2.665,1.40,room_z0+.21,'ART',.29,'#62eaff')
ROOM_ACTIVE=False
# cyan overhead lamp on LEFT room wall
box(room_x0+.16,3.38,-.62,.25,.20,2.96,'#131e48')
ROOM_ACTIVE=True
box(room_x0+.302,3.37,-.62,.055,.078,2.67,'#37d8ff',True)
ROOM_ACTIVE=False
for zz in (-1.86,.62):box(room_x0+.18,3.36,zz,.09,.29,.11,'#24365d')
# room wall baseboard
box(room_x0+.16,.57,room_z,.11,.12,6.49,'#56558b')
box(room_x,.57,room_z0+.13,7.33,.12,.10,'#55558a')

# --- DESK AGAINST THE LEFT WALL ---
# Long axis along z, monitor faces +X toward the open room.
desk_x=2.00; desk_z=-.25
box(desk_x,1.31,desk_z,1.27,.16,3.55,'#bb6a51')
box(desk_x,1.41,desk_z,1.34,.095,3.59,'#d8835b')
# wood grain strips along z
for xx in (desk_x-.47,desk_x-.19,desk_x+.16,desk_x+.47):
    box(xx,1.467,desk_z,.019,.008,3.38,'#e39165')
# Load-bearing four-leg desk frame, all feet meet the finished tile floor (y=.388).
# Four solid posts plus a front/back apron keep the desktop visibly supported.
FLOOR_Y=.388
DESK_UNDERSIDE=1.23
for leg_x in (desk_x-.47, desk_x+.47):
    for leg_z in (desk_z-1.52,desk_z+1.52):
        leg_height=DESK_UNDERSIDE-FLOOR_Y
        box(leg_x,FLOOR_Y+leg_height/2,leg_z,.14,leg_height,.14,'#323d68')
        box(leg_x,FLOOR_Y+.055,leg_z,.19,.10,.19,'#202b4e')
for edge_x in (desk_x-.47,desk_x+.47):
    box(edge_x,1.18,desk_z,.10,.10,3.19,'#354367')
# Real drawer pedestal flush against the underside of the top and grounded.
# This is a separate side cabinet rather than a second 'floating' leg.
cab_x,cab_z=desk_x+.06,desk_z+1.37
cab_h=DESK_UNDERSIDE-FLOOR_Y
box(cab_x,FLOOR_Y+cab_h/2,cab_z,1.08,cab_h,.55,'#30365b')
box(cab_x+.558,FLOOR_Y+cab_h/2,cab_z,.035,cab_h-.07,.49,'#424c7d')
for yy in (.78,1.06):
    box(cab_x+.588,yy,cab_z,.028,.218,.47,'#646a9e')
    box(cab_x+.610,yy,cab_z,.020,.034,.22,'#bbc2e9')
# desk monitor metal arm and stand
mx,my,mz=desk_x+.03,2.20,-.51
box(mx-.16,1.58,mz,.42,.09,.58,'#232c4c')
box(mx-.23,1.82,mz,.075,.53,.10,'#384568')
box(mx,2.21,mz,.25,1.05,1.55,'#101e40')
box(mx+.154,2.21,mz,.055,.86,1.36,'#283a77')
box(mx+.194,2.21,mz,.032,.77,1.27,'#111a54')
# pixel corner brackets + JP on the MONITOR ONLY
ROOM_ACTIVE=True
bracket('+x',mx+.221,2.22,mz,.435,'#6ee6ff')
pixel_text('+x',mx+.247,2.21,mz+.40,'JP',.065,'#6ceaff')
ROOM_ACTIVE=False
# Real raised 3D keyboard keycaps: five rows instead of three painted strips.
keyboard_x=desk_x+.44
keyboard_z=-.32
box(keyboard_x,1.510,keyboard_z,.41,.075,1.15,'#0b1730')
box(keyboard_x,1.550,keyboard_z,.398,.012,1.12,'#243452')
for row_idx in range(5):
    key_x=keyboard_x-.160+row_idx*.078
    for col_idx in range(13):
        key_z=keyboard_z-.505+col_idx*.078
        # One long spacebar spans the central part of the bottom row.
        if row_idx==4 and 3<=col_idx<=9:
            if col_idx==3:
                box(key_x,1.574,keyboard_z-.040,.050,.034,.535,'#8ca0d0')
            continue
        key_col=('#6e82b4' if (row_idx+col_idx)%5==0 else '#4b5c85')
        box(key_x,1.574,key_z,.050,.034,.054,key_col)
        box(key_x,1.592,key_z,.038,.006,.041,'#91a0ce')
# Separate mouse to the VISUAL RIGHT of the keyboard, on the desk.
# For this camera right in the image corresponds to negative z on the desktop.
mouse_x,mouse_z=desk_x+.47,-1.215
box(mouse_x,1.520,mouse_z,.196,.079,.235,'#202c4e')
for mz_key in (mouse_z-.056,mouse_z+.056):
    box(mouse_x+.009,1.567,mz_key,.152,.021,.097,'#42527e')
box(mouse_x+.019,1.582,mouse_z,.028,.014,.032,'#57daff',True)
# Amber lamp on desk near z positive end
box(desk_x-.05,1.51,1.04,.27,.12,.27,'#302e51')
box(desk_x-.05,1.78,1.04,.39,.41,.39,'#ffbf52',True)
box(desk_x-.05,2.01,1.04,.42,.06,.42,'#ffdf8d',True)
# Tiny voxel plant at opposite end: white pot and green cubic leaves
box(desk_x-.20,1.60,-1.65,.37,.30,.38,'#a6a0c4')
box(desk_x-.2,1.78,-1.65,.09,.36,.09,'#357a4e')
for px,py,pz,ps in [(-.25,1.99,-1.61,.24),(-.36,1.91,-1.76,.19),(-.08,1.97,-1.63,.21),(-.2,2.18,-1.59,.18),(-.2,1.92,-1.42,.19)]:
    box(desk_x+px,py,pz,ps,ps,ps,'#48b34f')
# Grounded, non-floating ergonomic chair: wheels rest on top of the actual floor.
CHAIR_ACTIVE=True
chair_x,chair_z=3.25,-.55
chair_lift=FLOOR_Y-(.18-.13/2)   # bottom of each caster exactly matches floor y=.388
cy=lambda y:y+chair_lift
box(chair_x,cy(.86),chair_z,.91,.22,.79,'#2c325c')
box(chair_x+.34,cy(1.39),chair_z,.18,1.04,.89,'#313b73')
box(chair_x+.45,cy(1.48),chair_z,.085,.78,.75,'#273259')
box(chair_x,cy(.54),chair_z,.13,.63,.13,'#343c67')
for dz in (-.30,.30):box(chair_x,cy(.24),chair_z+dz,.64,.085,.09,'#252f50')
for dx in (-.25,.25):box(chair_x+dx,cy(.24),chair_z,.09,.085,.64,'#252f50')
for dx in (-.35,.35):
    for dz in (-.27,.27):
        box(chair_x+dx,cy(.18),chair_z+dz,.15,.13,.14,'#1c2444')
# arm rests attached to the chair, not floating in space.
for dz in (-.43,.43):
    box(chair_x+.04,cy(1.04),chair_z+dz,.57,.08,.12,'#3e4972')

# --- PHYSICAL DATA LINK: LOWEST RACK SHELF -> WALL -> MONITOR BACK ---
CHAIR_ACTIVE=False
ROOM_GEOMETRY=False
yc=.727
SIGNAL_PATH=[
    [rx+1.37,yc,.20],[-2.20,yc,.20],[-2.20,yc,3.72],
    [room_x0+.30,yc,3.72],[room_x0+.30,yc,2.80],
    [room_x0+.30,yc,mz],[room_x0+.30,1.60,mz],
    [mx-.13,1.60,mz],[mx-.13,1.98,mz],
]
# The plug overlaps the bottom unit's front panel, not the rack side or empty space.
RACK_ACTIVE=True
box(rx+1.43,yc,.20,.19,.23,.32,'#142d25')
surface_x(rx+1.535,yc,.20,.25,.16,'#59ff89',True)
RACK_ACTIVE=False
distance=0.0
for start,end in zip(SIGNAL_PATH,SIGNAL_PATH[1:]):
    axis=next(i for i in range(3) if start[i]!=end[i])
    length=abs(end[axis]-start[axis]); direction=1 if end[axis]>start[axis] else -1
    center=[(a+b)/2 for a,b in zip(start,end)]
    dims=[.17,.17,.17];dims[axis]=length+.01
    box(*center,*dims,'#182e35')
    # Two inset luminous tracks keep the cable readable in the fixed isometric view.
    sampler=lambda p,a=axis,s=start[axis],d=distance,k=direction,l=length: d+max(0,min(l,(p[a]-s)*k))
    for face in (1,2):
        if face==axis:continue
        track_center=center.copy();track_center[face]+=.091
        track_dims=[.085,.085,.085];track_dims[axis]=length+.015;track_dims[face]=.04
        box(*track_center,*track_dims,'#16352e',True,signal=sampler)
    distance+=length
    box(*end,.205,.205,.205,'#35534c')
    box(end[0],end[1]+.112,end[2],.12,.026,.12,'#16352e',True,signal=lambda p,d=distance:d)
SIGNAL_LENGTH=distance
# Cable wraps around the cutaway wall end, without piercing or glowing through it.
box(room_x0+.30,yc,room_z1+.17,.29,.29,.14,'#304951')
box(mx-.13,1.99,mz,.16,.13,.23,'#1c3545')

# --- Render / standard glTF2 asset export ---
def prepare(collection):
    pos=np.asarray(collection['pos'],dtype=np.float32).reshape(-1,3)
    normals=np.asarray(collection['normal'],dtype=np.float32).reshape(-1,3)
    colors=np.asarray(collection['colors'],dtype=np.uint8).reshape(-1,4)
    idx=np.asarray(collection['idx'],dtype=np.uint32)
    return pos,normals,colors,idx

data_parts=[]; views=[]; accessors=[]; mesh_primitives=[]

def pack_array(raw,target):
    offset=sum(len(d) for d in data_parts)
    padding=(-offset)%4
    if padding: data_parts.append(b'\0'*padding);offset+=padding
    data_parts.append(raw)
    view_index=len(views)
    views.append({'buffer':0,'byteOffset':offset,'byteLength':len(raw),'target':target})
    return view_index

def add_accessor(view,comp_type,count,item_type,**kwargs):
    ac={'bufferView':view,'componentType':comp_type,'count':count,'type':item_type};ac.update(kwargs)
    idx=len(accessors);accessors.append(ac);return idx

for prim_idx,collection in enumerate(COLLECTIONS):
    pos,nor,col,ind=prepare(collection)
    attrs={}
    attrs['POSITION']=add_accessor(pack_array(pos.tobytes(),34962),5126,len(pos),'VEC3',min=pos.min(axis=0).tolist(),max=pos.max(axis=0).tolist())
    attrs['NORMAL']=add_accessor(pack_array(nor.tobytes(),34962),5126,len(nor),'VEC3')
    attrs['COLOR_0']=add_accessor(pack_array(col.tobytes(),34962),5121,len(col),'VEC4',normalized=True)
    attrs['_SIGNAL']=add_accessor(pack_array(np.asarray(collection['signal'],dtype=np.float32).tobytes(),34962),5126,len(pos),'SCALAR')
    attrs['_RACK']=add_accessor(pack_array(np.asarray(collection['rack'],dtype=np.float32).tobytes(),34962),5126,len(pos),'SCALAR')
    attrs['_ROOM']=add_accessor(pack_array(np.asarray(collection['room'],dtype=np.float32).tobytes(),34962),5126,len(pos),'SCALAR')
    attrs['_BUTTON']=add_accessor(pack_array(np.asarray(collection['button'],dtype=np.float32).tobytes(),34962),5126,len(pos),'SCALAR')
    attrs['_CHAIR']=add_accessor(pack_array(np.asarray(collection['chair'],dtype=np.float32).tobytes(),34962),5126,len(pos),'SCALAR')
    idx_accessor=add_accessor(pack_array(ind.tobytes(),34963),5125,len(ind),'SCALAR')
    mesh_primitives.append({'attributes':attrs,'indices':idx_accessor,'material':prim_idx,'mode':4})
    print(('Opaque' if prim_idx==0 else 'Emissive'),len(pos),'vertices,',len(ind)//3,'triangles')

payload=b''.join(data_parts);payload+=b'\0'*((-len(payload))%4)
model={
 'asset':{'version':'2.0','generator':'JP Voxel Room / pure 3D geometry generator'},
 'extras':{'signalPath':SIGNAL_PATH,'signalLength':SIGNAL_LENGTH,'wallNeon':WALL_NEON},
 'scene':0,'scenes':[{'nodes':[0]}],
 'nodes':[{'mesh':0,'name':'Server rack + office room / isometric'}],
 'meshes':[{'name':'Procedural voxel server and workspace', 'primitives':mesh_primitives}],
 'materials':[
   {'name':'Physically shaded voxel surfaces','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':.85},'doubleSided':True},
   {'name':'Emission neon pixels and strips','pbrMetallicRoughness':{'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':1},'emissiveFactor':[1,1,1],'doubleSided':True}
 ],
 'accessors':accessors,'bufferViews':views,'buffers':[{'byteLength':len(payload)}]
}
js=json.dumps(model,separators=(',',':')).encode('utf-8');js+=b' ' *((-len(js))%4)
glb=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(payload))
glb+=struct.pack('<II',len(js),0x4E4F534A)+js
glb+=struct.pack('<II',len(payload),0x004E4942)+payload
(ROOT/'room-server.glb').write_bytes(glb)
(ROOT/'scene-description.json').write_text(json.dumps({'name':'Server rack + one room (data link v1.2)','description':'Full 3D voxel scene. Navy-purple cabinet with green light accents, bottom-shelf data cable physically connected to the monitor. Green outbound and blue inbound pulses; only rack light accents and the visible crystal face blink blue on receipt; overhead lamp, monitor lettering, ASCI ART wall neon and floor perimeter LEDs blink green on computer receipt. Opaque walls occlude the glow.','room_walls':2,'camera':'fixed isometric','interactive':True,'animated':True,'geometry_revision':'1.2','signal_path':SIGNAL_PATH,'signal_length':SIGNAL_LENGTH,'objects':BOX_COUNTER,'vertices':sum(len(c['pos']) for c in COLLECTIONS),'triangles':sum(len(c['idx'])//3 for c in COLLECTIONS)},indent=2))
print('Generated boxes:',BOX_COUNTER,'model bytes:',len(glb))