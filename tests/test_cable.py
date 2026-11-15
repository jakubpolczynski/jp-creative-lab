"""Build in a temporary directory; verify physical cable attachment and animation tags."""
import json
import pathlib
import runpy
import shutil
import struct
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

class CableGeometryTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        source = pathlib.Path(cls.temp.name) / 'build_model.py'
        shutil.copy2(ROOT / 'build_model.py', source)
        cls.builder = runpy.run_path(str(source))
        data = (source.parent / 'room-server.glb').read_bytes()
        size = struct.unpack_from('<I', data, 12)[0]
        cls.doc = json.loads(data[20:20 + size])

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_cable_starts_at_lowest_rack_shelf(self):
        path = self.doc.get('extras', {}).get('signalPath', [])
        self.assertGreaterEqual(len(path), 6, 'Model must export the complete cable route')
        self.assertAlmostEqual(path[0][0], self.builder['rx'] + 1.37, places=4)
        self.assertAlmostEqual(path[0][1], .727, places=4)
        self.assertLess(abs(path[0][2] - self.builder['rz']), .98)

    def test_cable_has_no_diagonal_or_disconnected_segments(self):
        path = self.doc.get('extras', {}).get('signalPath', [])
        self.assertTrue(path, 'Cable route missing')
        for start, end in zip(path, path[1:]):
            self.assertEqual(sum(abs(a-b) > 1e-6 for a,b in zip(start,end)), 1)
        self.assertAlmostEqual(path[-1][0], self.builder['mx'] - .13, places=4)
        self.assertAlmostEqual(path[-1][2], self.builder['mz'], places=4)

    def test_rack_blink_is_limited_to_light_accents(self):
        opaque, emissive = self.builder['COLLECTIONS']
        self.assertTrue(all(v == 0 for v in opaque['rack']), 'Solid cabinet must not flash blue')
        self.assertTrue(any(v == 1 for v in emissive['rack']), 'Light accents must flash')
        self.assertEqual(opaque['colors'][0][:3], self.builder['tint']('#161f41', .94), 'Restore original dark navy cabinet palette')

    def test_receiver_masks_only_cover_requested_lights(self):
        opaque, emissive = self.builder['COLLECTIONS']
        self.assertTrue(all(v == 0 for v in opaque['room']))
        room_points = [p for p, active in zip(emissive['pos'], emissive['room']) if active]
        self.assertTrue(room_points)
        self.assertTrue(all((p[1] > .65 and p[2] < -2.9) or (p[1] > 1.65 and p[2] < .9) or (-.06 <= p[1] <= .02 and (p[0] < 1.12 or p[0] > 8.85 or p[2] < -3.25 or p[2] > 3.38)) for p in room_points), 'Only wall/monitor lights and perimeter LED should react')
        crystal_points = [(p, active) for p, active in zip(emissive['pos'], emissive['rack']) if p[1] > 5.35]
        self.assertTrue(crystal_points)
        self.assertTrue(all(active for p, active in crystal_points))

    def test_button_moves_room_not_rack(self):
        for group in self.builder['COLLECTIONS']:
            self.assertIn('button', group)
            for p, rack, button in zip(group['pos'], group['rack'], group['button']):
                if rack:
                    self.assertEqual(button, 0)
                if p[0] > 4:
                    self.assertEqual(button, 1)
            self.assertTrue(all(0 <= v <= 1 for v in group['button']))

    def test_chair_mask_excludes_other_furniture(self):
        points=[]
        for group in self.builder['COLLECTIONS']:
            self.assertTrue('chair' in group, 'Dedicated chair motion mask missing')
            for p,active in zip(group['pos'],group['chair']):
                if active:
                    points.append(p)
                    self.assertTrue(2.6 < p[0] < 3.9 and -1.1 < p[2] < .1)
        self.assertGreater(len(points),200)
        for primitive in self.doc['meshes'][0]['primitives']:
            self.assertIn('_CHAIR',primitive['attributes'])

    def test_wall_neon_preserves_requested_text(self):
        self.assertEqual(self.doc.get('extras', {}).get('wallNeon'), 'ASCI ART')
        self.assertTrue(all(ch in self.builder['GLYPH'] for ch in 'ASCIRT'))
        neon = [p for p,active in zip(self.builder['COLLECTIONS'][1]['pos'], self.builder['COLLECTIONS'][1]['room']) if active and -3.1 < p[2] < -2.9]
        self.assertGreater(max(p[0] for p in neon)-min(p[0] for p in neon), 6.5, 'Neon must span the wall width')
        self.assertGreater(max(p[1] for p in neon)-min(p[1] for p in neon), 2.8, 'Neon must fill the wall height')

    def test_export_contains_cable_distance_and_rack_membership(self):
        for primitive in self.doc['meshes'][0]['primitives']:
            self.assertIn('_SIGNAL', primitive['attributes'])
            self.assertIn('_RACK', primitive['attributes'])
        self.assertTrue(any(v > 0 for c in self.builder['COLLECTIONS'] for v in c['rack']))
        self.assertTrue(any(v >= 0 for c in self.builder['COLLECTIONS'] for v in c['signal']))

if __name__ == '__main__':
    unittest.main()
