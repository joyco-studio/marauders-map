"""Run in Blender via MCP. Geometry-only GLB; materials are owned by the app."""
import bpy
import math
from pathlib import Path

ROOT = Path('/Users/justkahdri/conductor/workspaces/marauders-map/pattaya')
previous_scene = bpy.context.window.scene
wand_scene = bpy.data.scenes.new('Marauders Wand Authoring')
bpy.context.window.scene = wand_scene

# Model along Blender Z; glTF export converts the length axis to +Y.
profile = [(0, .12), (.04, .20), (.14, .23), (.26, .20), (.40, .16),
           (.65, .145), (.95, .16), (1.20, .175), (1.34, .20),
           (1.43, .15), (1.52, .11), (1.75, .10), (2.2, .085),
           (2.8, .069), (3.5, .052), (4.2, .035), (4.65, .024), (4.72, .006)]

def radius(z):
    for (a, ra), (b, rb) in zip(profile, profile[1:]):
        if a <= z <= b:
            t = (z-a)/(b-a)
            t = t*t*(3-2*t)
            return ra + (rb-ra)*t
    return profile[-1][1]

vertices, faces, coords = [], [], []
rings, sides = 190, 40
for i in range(rings+1):
    z = 4.72*i/rings
    for j in range(sides+1):
        a = 2*math.pi*j/sides
        irregular = 1 + .026*math.sin(a*7+z*8) + .012*math.sin(a*13-z*19)
        r = radius(z)*irregular
        vertices.append((r*math.cos(a), r*math.sin(a), z))
        coords.append((j/sides, z/4.72))
for i in range(rings):
    for j in range(sides):
        a = i*(sides+1)+j
        faces.append((a, a+1, a+sides+2, a+sides+1))
faces.append(tuple(reversed(range(sides))))
faces.append(tuple(rings*(sides+1)+j for j in range(sides)))
mesh = bpy.data.meshes.new('Wand longitudinal UV mesh')
mesh.from_pydata(vertices, [], faces)
mesh.update()
uv = mesh.uv_layers.new(name='Wood grain along length')
for poly in mesh.polygons:
    poly.use_smooth = True
    for li in poly.loop_indices:
        uv.data[li].uv = coords[mesh.loops[li].vertex_index]
body = bpy.data.objects.new('Wand carved wood body', mesh)
wand_scene.collection.objects.link(body)

# Raised interlacing vines create real silhouette and shadow detail.
for strand in range(4):
    curve = bpy.data.curves.new('Entwined handle vine', 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 2
    curve.bevel_depth = .027 if strand % 2 == 0 else .021
    curve.bevel_resolution = 3
    spline = curve.splines.new('POLY')
    spline.points.add(95)
    for i, p in enumerate(spline.points):
        t = i/95
        z = .16 + 1.28*t
        a = strand*math.pi/2 + t*math.pi*2.2 + .24*math.sin(t*math.pi*4+strand)
        r = radius(z) + .008
        p.co = (r*math.cos(a), r*math.sin(a), z, 1)
        p.radius = .30 + .70*math.sin(math.pi*t)**.4
    obj = bpy.data.objects.new('Carved vine %s' % strand, curve)
    wand_scene.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    for p in obj.data.polygons:
        p.use_smooth = True
    # Generated curve UV is suitable for the same longitudinal grain.
    obj.select_set(False)

bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/map/wand/wand.glb'), export_format='GLB',
                         use_active_scene=True, export_materials='NONE', export_animations=False)
bpy.context.window.scene = previous_scene
result = {'path': str(ROOT/'public/map/wand/wand.glb'), 'scene': wand_scene.name,
          'meshes': len(wand_scene.objects), 'existing_scene_restored': previous_scene.name}
