"""Original pickup and Class 8 tractor. Blender Z-up, nose +Y, so glTF faces -Z.

Run: blender --background --python scripts/build-real-fleet.py -- pickup
"""
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

OUT = os.environ.get("FLEET_OUT", "/tmp/fleet-models")
os.makedirs(OUT, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def principled(name, base, metallic, rough, coat=0.0, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*base, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = rough
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
    if "Coat Roughness" in bsdf.inputs:
        bsdf.inputs["Coat Roughness"].default_value = 0.12
    if emission is not None and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    mat.use_backface_culling = False
    return mat


def mesh_of(name, verts, faces, material):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.validate(verbose=False)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material)
    return ob


def shade(ob):
    me = ob.data
    for poly in me.polygons:
        poly.use_smooth = True
    if hasattr(me, "use_auto_smooth"):
        me.use_auto_smooth = True
        me.auto_smooth_angle = math.radians(48)


def apply_mods(ob):
    deps = bpy.context.evaluated_depsgraph_get()
    eval_ob = ob.evaluated_get(deps)
    new = bpy.data.meshes.new_from_object(eval_ob)
    old = ob.data
    ob.modifiers.clear()
    ob.data = new
    bpy.data.meshes.remove(old)
    shade(ob)


def bevel_sub(ob, width, segments, levels, angle=32):
    bev = ob.modifiers.new("Bevel", "BEVEL")
    bev.width = width
    bev.segments = segments
    bev.limit_method = "ANGLE"
    bev.angle_limit = math.radians(angle)
    bev.affect = "EDGES"
    if levels:
        sub = ob.modifiers.new("Subd", "SUBSURF")
        sub.levels = levels
        sub.render_levels = levels
    apply_mods(ob)


def boolean_cut(ob, cutter):
    mod = ob.modifiers.new("Cut", "BOOLEAN")
    mod.operation = "DIFFERENCE"
    mod.solver = "EXACT"
    mod.object = cutter
    apply_mods(ob)
    bpy.data.objects.remove(cutter, do_unlink=True)


def cutter_x(name, y, z, radius, depth):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=72,
        radius=radius,
        depth=depth,
        location=(0, y, z),
        rotation=(0, math.pi / 2, 0),
    )
    ob = bpy.context.active_object
    ob.name = name
    return ob


def grid_sheet(name, x0, x1, y0, y1, z_fn, ny, nz, material):
    """Thick sheet. z_fn(y) -> (z_low, z_high). Two x layers."""
    verts = []
    layers = (x0, x1)
    for x in layers:
        for i in range(ny + 1):
            y = y0 + (y1 - y0) * i / ny
            z_lo, z_hi = z_fn(y)
            for j in range(nz + 1):
                z = z_lo + (z_hi - z_lo) * j / nz
                verts.append((x, y, z))
    stride = (ny + 1) * (nz + 1)
    faces = []
    for layer in range(1):
        base = layer * stride
        other = stride
        for i in range(ny):
            for j in range(nz):
                a = base + i * (nz + 1) + j
                b = a + 1
                c = a + (nz + 1) + 1
                d = a + (nz + 1)
                # outer skin only on x1 (layer index 1 is built second). Build both caps later.
                faces.append((a, d, c, b) if x0 < x1 else (a, b, c, d))
        # stitch the rim between the two layers
    # second layer faces (outer if x1 is outside)
    base = stride
    for i in range(ny):
        for j in range(nz):
            a = base + i * (nz + 1) + j
            b = a + 1
            c = a + (nz + 1) + 1
            d = a + (nz + 1)
            faces.append((a, b, c, d))
    # rims
    def vid(layer, i, j):
        return layer * stride + i * (nz + 1) + j

    for i in range(ny):
        for j0, j1, flip in ((0, 0, False), (nz, nz, True)):
            a = vid(0, i, j0)
            b = vid(0, i + 1, j0)
            c = vid(1, i + 1, j1)
            d = vid(1, i, j1)
            faces.append((a, b, c, d) if not flip else (a, d, c, b))
    for j in range(nz):
        for i0, flip in ((0, False), (ny, True)):
            a = vid(0, i0, j)
            b = vid(0, i0, j + 1)
            c = vid(1, i0, j + 1)
            d = vid(1, i0, j)
            faces.append((a, d, c, b) if not flip else (a, b, c, d))
    return mesh_of(name, verts, faces, material)


def surface_grid(name, xs, ys, z_fn, material, flip=False):
    verts = []
    nx, ny = len(xs), len(ys)
    for y in ys:
        for x in xs:
            verts.append((x, y, z_fn(x, y)))
    faces = []
    for i in range(ny - 1):
        for j in range(nx - 1):
            a = i * nx + j
            b = a + 1
            c = a + nx + 1
            d = a + nx
            faces.append((a, d, c, b) if flip else (a, b, c, d))
    return mesh_of(name, verts, faces, material)


def wheel(name, x, y, z, radius, width, rubber, metal):
    segs = 56
    rings = 7
    verts = []
    faces = []
    for i in range(rings):
        u = i / (rings - 1)
        lateral = (u - 0.5) * width
        side = abs(u - 0.5) * 2
        bulge = math.sqrt(max(0.0, 1 - side * side)) * radius * 0.045
        groove = 0.007 * math.sin(u * math.pi * 5) if 0.18 < u < 0.82 else 0
        for j in range(segs):
            ang = j / segs * math.tau
            tread = groove * math.sin(j / segs * math.tau * 16)
            r = radius - radius * 0.03 + bulge - tread
            verts.append((x + lateral, y + math.cos(ang) * r, z + math.sin(ang) * r))
    for i in range(rings - 1):
        for j in range(segs):
            a = i * segs + j
            b = i * segs + (j + 1) % segs
            c = (i + 1) * segs + (j + 1) % segs
            d = (i + 1) * segs + j
            faces.append((a, b, c, d))
    tire = mesh_of(name, verts, faces, rubber)
    bevel_sub(tire, 0.004, 1, 0, 50)
    # aero disc
    disc_r = radius * 0.62
    dv = []
    df = []
    dv.append((x + width * 0.46, y, z))
    for j in range(segs):
        ang = j / segs * math.tau
        dv.append((x + width * 0.48, y + math.cos(ang) * disc_r, z + math.sin(ang) * disc_r))
    for j in range(segs):
        df.append((0, 1 + j, 1 + (j + 1) % segs))
    disc = mesh_of(name + "Hub", dv, df, metal)
    shade(disc)
    # cap
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24,
        radius=radius * 0.16,
        depth=0.04,
        location=(x + width * 0.5, y, z),
        rotation=(0, math.pi / 2, 0),
    )
    cap = bpy.context.active_object
    cap.name = name + "Cap"
    cap.data.materials.append(metal)
    shade(cap)


def paint_vertex_ao(ob):
    me = ob.data
    if not me.vertices:
        return
    attr = me.color_attributes.new("Color", "FLOAT_COLOR", "POINT")
    me.color_attributes.active = attr
    for v in me.vertices:
        up = max(0.0, v.normal.z)
        shade = 0.62 + 0.38 * up
        if v.co.z < 0.45:
            shade *= 0.82
        attr.data[v.index].color = (shade, shade, shade, 1)


def tris(ob):
    me = ob.data
    me.calc_loop_triangles()
    return len(me.loop_triangles)


def export(path, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objects:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_normals=True,
        export_materials="EXPORT",
    )
    total = sum(tris(ob) for ob in objects)
    print(f"EXPORT {path} tris {total}")


def lerp(a, b, t):
    return a + (b - a) * t


def sample_keys(keys, y):
    if y <= keys[0][0]:
        return keys[0][1]
    if y >= keys[-1][0]:
        return keys[-1][1]
    for i in range(len(keys) - 1):
        y0, z0 = keys[i]
        y1, z1 = keys[i + 1]
        if y0 <= y <= y1:
            t = (y - y0) / (y1 - y0)
            return lerp(z0, z1, t)
    return keys[-1][1]


def build_pickup():
    reset()
    steel = principled("Paint", (0.78, 0.79, 0.80), 1.0, 0.34, coat=0.55)
    glass = principled("Glass", (0.05, 0.07, 0.09), 0.55, 0.06, coat=0.4)
    rubber = principled("Rubber", (0.02, 0.02, 0.022), 0.0, 0.94)
    lamp = principled("Lamp", (1.0, 0.96, 0.88), 0.1, 0.25, emission=(1.0, 0.95, 0.8), emission_strength=8)
    tail = principled("Tail", (0.55, 0.02, 0.015), 0.05, 0.3, emission=(0.85, 0.05, 0.03), emission_strength=6)
    trim = principled("Trim", (0.02, 0.02, 0.025), 0.15, 0.45)
    chrome = principled("Chrome", (0.75, 0.76, 0.78), 0.92, 0.18, coat=0.3)

    # 5.70 x 2.00 x 1.79. Nose +Y. Wheelbase 3.63 m.
    nose, tail_y = 2.85, -2.85
    front_axle, rear_axle = 1.55, 1.55 - 3.63
    wheel_r, arch_r = 0.42, 0.52
    wheel_z = wheel_r
    half_w = 0.98

    roof_keys = [
        (tail_y, 0.55),
        (-2.45, 1.48),
        (-1.35, 1.74),
        (0.15, 1.78),
        (0.85, 1.42),
        (1.85, 1.08),
        (nose, 0.58),
    ]

    def z_fn(y):
        z_lo, z_hi = 0.30, sample_keys(roof_keys, y)
        for axle in (front_axle, rear_axle):
            dy = y - axle
            if abs(dy) < arch_r:
                arch_top = wheel_z + math.sqrt(max(0.0, arch_r * arch_r - dy * dy))
                z_lo = max(z_lo, arch_top)
        return z_lo, max(z_hi, z_lo + 0.05)

    objects = []
    for sign, name in ((1, "Paint"), (-1, "Paint.L")):
        x_outer = sign * half_w
        x_inner = sign * (half_w - 0.07)
        x0, x1 = (x_inner, x_outer) if sign > 0 else (x_outer, x_inner)
        side = grid_sheet(name, x0, x1, tail_y, nose, z_fn, ny=96, nz=16, material=steel)
        bevel_sub(side, 0.007, 2, 1, 36)
        paint_vertex_ao(side)
        objects.append(side)

    def roof_z(x, y):
        crown = 0.012 * (1 - (x / half_w) ** 2)
        return sample_keys(roof_keys, y) + crown

    # Hood and roof only over the closed cabin. Bed stays open.
    xs = [lerp(-half_w + 0.04, half_w - 0.04, i / 16) for i in range(17)]
    hood_ys = [lerp(0.95, nose - 0.02, i / 18) for i in range(19)]
    hood = surface_grid("Paint.hood", xs, hood_ys, roof_z, steel)
    bevel_sub(hood, 0.006, 1, 1, 40)
    paint_vertex_ao(hood)
    objects.append(hood)
    roof_ys = [lerp(-0.15, 0.85, i / 12) for i in range(13)]
    roof = surface_grid("Paint.roof", xs, roof_ys, roof_z, steel)
    bevel_sub(roof, 0.006, 1, 1, 40)
    paint_vertex_ao(roof)
    objects.append(roof)

    # Bed floor and tailgate.
    bed_ys = [lerp(-2.55, -0.2, i / 14) for i in range(15)]
    bed = surface_grid("Trim.bed", xs, bed_ys, lambda x, y: 0.78, trim)
    shade(bed)
    objects.append(bed)
    gate = surface_grid(
        "Paint.tail",
        xs,
        [-2.72, -2.55],
        lambda x, y: lerp(0.42, 1.42, (y + 2.72) / 0.17),
        steel,
    )
    bevel_sub(gate, 0.005, 1, 0, 35)
    objects.append(gate)

    # Nose slab.
    nose_xs = xs
    nose_mesh = surface_grid(
        "Paint.nose",
        nose_xs,
        [nose - 0.08, nose],
        lambda x, y: lerp(0.28, sample_keys(roof_keys, y), 0.5 + 0.5 * (y - (nose - 0.08)) / 0.08),
        steel,
    )
    objects.append(nose_mesh)

    # Glass band: windshield, side windows, backlight. Inset just outboard of the sail.
    glass_ys = [lerp(0.45, 1.65, i / 10) for i in range(11)]
    win = surface_grid(
        "Glass",
        [lerp(-0.9, 0.9, i / 12) for i in range(13)],
        glass_ys,
        lambda x, y: roof_z(x, y) + 0.012,
        glass,
    )
    shade(win)
    objects.append(win)
    for sign in (1, -1):
        x = sign * (half_w + 0.004)
        side_glass = surface_grid(
            "Glass.side",
            [x, x + sign * 0.001],
            [lerp(-1.05, 0.55, i / 8) for i in range(9)],
            lambda _x, y: lerp(1.18, sample_keys(roof_keys, y) - 0.04, 0.55),
            glass,
        )
        # rebuild properly as a vertical band
        bpy.data.objects.remove(side_glass, do_unlink=True)
        ys = [lerp(-1.15, 0.62, i / 12) for i in range(13)]
        zs = [lerp(1.12, 1.62, j / 4) for j in range(5)]
        sv, sf = [], []
        for y in ys:
            z_top = min(sample_keys(roof_keys, y) - 0.05, 1.7)
            for z in zs:
                zz = min(z, z_top)
                sv.append((x, y, zz))
        nx, ny = len(zs), len(ys)
        for i in range(ny - 1):
            for j in range(nx - 1):
                a = i * nx + j
                sf.append((a, a + 1, a + nx + 1, a + nx) if sign > 0 else (a, a + nx, a + nx + 1, a + 1))
        sg = mesh_of("Glass", sv, sf, glass)
        shade(sg)
        objects.append(sg)

    # Full-width lamp bar and tail bar.
    bar = mesh_of(
        "Lamp",
        [
            (-0.92, nose + 0.01, 0.7),
            (0.92, nose + 0.01, 0.7),
            (0.92, nose + 0.02, 0.78),
            (-0.92, nose + 0.02, 0.78),
            (-0.92, nose - 0.02, 0.7),
            (0.92, nose - 0.02, 0.7),
            (0.92, nose - 0.01, 0.78),
            (-0.92, nose - 0.01, 0.78),
        ],
        [
            (0, 1, 2, 3),
            (4, 7, 6, 5),
            (0, 4, 5, 1),
            (3, 2, 6, 7),
            (0, 3, 7, 4),
            (1, 5, 6, 2),
        ],
        lamp,
    )
    objects.append(bar)
    tail_bar = mesh_of(
        "Tail",
        [
            (-0.9, tail_y - 0.01, 0.85),
            (0.9, tail_y - 0.01, 0.85),
            (0.9, tail_y - 0.02, 0.95),
            (-0.9, tail_y - 0.02, 0.95),
            (-0.9, tail_y + 0.02, 0.85),
            (0.9, tail_y + 0.02, 0.85),
            (0.9, tail_y + 0.01, 0.95),
            (-0.9, tail_y + 0.01, 0.95),
        ],
        [
            (0, 1, 2, 3),
            (4, 7, 6, 5),
            (0, 4, 5, 1),
            (3, 2, 6, 7),
            (0, 3, 7, 4),
            (1, 5, 6, 2),
        ],
        tail,
    )
    objects.append(tail_bar)

    # Belt trim and a door cut so the side is not one slab.
    for sign in (1, -1):
        x = sign * (half_w + 0.006)
        belt = mesh_of(
            "Trim",
            [
                (x, -1.3, 1.05),
                (x, 0.7, 1.05),
                (x, 0.7, 1.09),
                (x, -1.3, 1.09),
            ],
            [(0, 1, 2, 3)],
            trim,
        )
        objects.append(belt)
        for y in (-0.35, 0.35):
            cut = mesh_of(
                "Trim",
                [(x, y, 0.4), (x, y + 0.02, 0.4), (x, y + 0.02, 1.08), (x, y, 1.08)],
                [(0, 1, 2, 3)],
                trim,
            )
            objects.append(cut)
        mirror = mesh_of(
            "Chrome",
            [
                (x, 0.35, 1.15),
                (x + sign * 0.16, 0.42, 1.2),
                (x + sign * 0.16, 0.55, 1.2),
                (x, 0.5, 1.15),
            ],
            [(0, 1, 2, 3)],
            chrome,
        )
        objects.append(mirror)

    for sign in (1, -1):
        for axle in (front_axle, rear_axle):
            wheel("Rubber", sign * 0.74, axle, 0.40, 0.40, 0.26, rubber, chrome)
    objects = [ob for ob in bpy.context.scene.objects if ob.type == "MESH" and not ob.name.startswith("cut")]
    export(os.path.join(OUT, "pickup.glb"), objects)


def ring(y, half_w, z0, z1, n=28):
    pts = []
    for i in range(n):
        t = i / n * math.tau
        c, s = math.cos(t), math.sin(t)
        # Rounded rectangle: flatter bottom, arched roof.
        ax = abs(c) ** 0.72 * math.copysign(1, c)
        az = abs(s) ** 0.55 * math.sin(t)
        x = ax * half_w
        if s < 0:
            z = z0 + (z1 - z0) * 0.08 * (1 + s)
        else:
            z = z0 + (z1 - z0) * (0.15 + 0.85 * az)
        pts.append(Vector((x, y, max(z0, z))))
    return pts


def loft(name, sections, material):
    n = len(sections[0])
    verts = []
    for section in sections:
        verts.extend(section)
    faces = []
    for i in range(len(sections) - 1):
        for j in range(n):
            a = i * n + j
            b = i * n + (j + 1) % n
            c = (i + 1) * n + (j + 1) % n
            d = (i + 1) * n + j
            faces.append((a, b, c, d))
    # cap the nose and the tail
    faces.append(tuple(range(n - 1, -1, -1)))
    base = (len(sections) - 1) * n
    faces.append(tuple(range(base, base + n)))
    return mesh_of(name, verts, faces, material)


def build_semi():
    reset()
    paint = principled("Paint", (0.16, 0.20, 0.26), 0.62, 0.28, coat=0.72)
    glass = principled("Glass", (0.04, 0.07, 0.10), 0.45, 0.05, coat=0.35)
    rubber = principled("Rubber", (0.015, 0.015, 0.018), 0.0, 0.95)
    lamp = principled("Lamp", (0.85, 0.92, 1.0), 0.05, 0.22, emission=(0.75, 0.9, 1.0), emission_strength=7)
    tail = principled("Tail", (0.5, 0.02, 0.02), 0.05, 0.3, emission=(0.8, 0.04, 0.03), emission_strength=5)
    trim = principled("Trim", (0.03, 0.03, 0.035), 0.2, 0.5)
    chrome = principled("Chrome", (0.72, 0.74, 0.76), 0.9, 0.2, coat=0.25)

    # Tractor only, ~7.6 m, so it fits the MCS pad. Nose +Y.
    # Sections from nose (high y) to the frame tail.
    specs = [
        # y, half_w, z0, z1
        (3.55, 1.05, 0.38, 1.15),
        (3.15, 1.18, 0.36, 1.55),
        (2.55, 1.26, 0.34, 2.15),
        (1.85, 1.28, 0.32, 2.85),
        (1.15, 1.27, 0.32, 3.35),
        (0.35, 1.26, 0.34, 3.55),
        (-0.35, 1.24, 0.38, 3.45),
        (-0.85, 1.18, 0.42, 2.4),
        (-1.15, 1.15, 0.45, 1.55),
    ]
    cab = loft("Paint", [ring(*row) for row in specs], paint)
    # Fairing aft of the cab, low and smooth, stops before a trailer would start.
    fair = [
        (-0.9, 1.16, 0.42, 1.45),
        (-1.6, 1.22, 0.40, 1.35),
        (-2.4, 1.2, 0.40, 1.25),
        (-3.15, 1.05, 0.42, 1.15),
        (-3.7, 0.95, 0.45, 1.05),
    ]
    fairing = loft("Paint.fair", [ring(*row, n=28) for row in fair], paint)
    for ob in (cab, fairing):
        bevel_sub(ob, 0.016, 2, 2, 42)
        paint_vertex_ao(ob)

    # Wheel arches through the fairing and the cab lower edge.
    wheel_r = 0.52
    wheel_z = wheel_r
    front_axle = 2.15
    drive = (-1.55, -2.85)
    for axle in (front_axle, *drive):
        target = cab if axle > 0 else fairing
        # Re-fetch by name in case modifiers replaced data but object identity remains.
        cut = cutter_x(f"arch{axle}", axle, wheel_z, wheel_r + 0.12, 3.2)
        try:
            boolean_cut(target, cut)
        except Exception as exc:
            print("arch skip", axle, exc)
            if cut.name in bpy.data.objects:
                bpy.data.objects.remove(cut, do_unlink=True)

    # Curved windshield over the nose sections.
    xs = [lerp(-1.15, 1.15, i / 14) for i in range(15)]
    ys = [lerp(1.35, 2.7, i / 10) for i in range(11)]

    def glass_z(x, y):
        edge = abs(x) / 1.15
        base = lerp(2.15, 3.25, (2.7 - y) / 1.35)
        return base - 0.35 * edge * edge

    win = surface_grid("Glass", xs, ys, glass_z, glass)
    bevel_sub(win, 0.004, 1, 1, 55)
    # Side glass.
    for sign in (1, -1):
        x = sign * 1.22
        sv, sf = [], []
        ys2 = [lerp(-0.15, 1.7, i / 10) for i in range(11)]
        zs = [lerp(1.7, 3.15, j / 5) for j in range(6)]
        for y in ys2:
            for z in zs:
                sv.append((x, y, z))
        nx = len(zs)
        for i in range(len(ys2) - 1):
            for j in range(len(zs) - 1):
                a = i * nx + j
                sf.append((a, a + 1, a + nx + 1, a + nx) if sign > 0 else (a, a + nx, a + nx + 1, a + 1))
        sg = mesh_of("Glass", sv, sf, glass)
        shade(sg)

    lamp_bar = mesh_of(
        "Lamp",
        [
            (-1.05, 3.58, 0.72),
            (1.05, 3.58, 0.72),
            (1.05, 3.62, 0.92),
            (-1.05, 3.62, 0.92),
            (-1.05, 3.48, 0.72),
            (1.05, 3.48, 0.72),
            (1.05, 3.52, 0.92),
            (-1.05, 3.52, 0.92),
        ],
        [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (3, 2, 6, 7), (0, 3, 7, 4), (1, 5, 6, 2)],
        lamp,
    )
    for sign, y in ((-1, -3.72), (1, -3.72)):
        mesh_of(
            "Tail",
            [
                (sign * 0.7, y, 0.7),
                (sign * 1.0, y, 0.7),
                (sign * 1.0, y - 0.02, 1.0),
                (sign * 0.7, y - 0.02, 1.0),
            ],
            [(0, 1, 2, 3)],
            tail,
        )
    # Fifth-wheel plate, plain, no trailer.
    plate = mesh_of(
        "Trim",
        [
            (-0.45, -1.35, 1.18),
            (0.45, -1.35, 1.18),
            (0.45, -0.55, 1.18),
            (-0.45, -0.55, 1.18),
        ],
        [(0, 1, 2, 3)],
        trim,
    )
    shade(plate)

    for sign in (1, -1):
        wheel("Rubber", sign * 1.05, front_axle, wheel_r, wheel_r, 0.32, rubber, chrome)
        for axle in drive:
            wheel("Rubber", sign * 1.02, axle, wheel_r, wheel_r, 0.34, rubber, chrome)

    objects = [ob for ob in bpy.context.scene.objects if ob.type == "MESH"]
    export(os.path.join(OUT, "semi.glb"), objects)


if __name__ == "__main__":
    which = "both"
    if len(sys.argv) > 1 and sys.argv[-1] in ("pickup", "semi", "both"):
        which = sys.argv[-1]
    if which in ("pickup", "both"):
        build_pickup()
    if which in ("semi", "both"):
        build_semi()
