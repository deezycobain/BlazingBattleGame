#!/usr/bin/env python3
"""Regression tests for the non-destructive animation source QA."""
import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

MODULE_PATH = Path(__file__).with_name("qa-sprite-frames.py")
SPEC = importlib.util.spec_from_file_location("blazing_sprite_qa", MODULE_PATH)
qa = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(qa)


class SpriteQATests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.folder = Path(self.temp.name)

    def tearDown(self):
        self.temp.cleanup()

    def make_frame(self, number, *, full=False, clipped=False, source=False):
        size = (1024, 1200) if source else (512, 768)
        image = Image.new("RGBA", size, (23, 44, 55, 255) if full else (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        bounds = (150, 100, 350, 699) if not source else (210, 160, 600, 1010)
        if clipped:
            bounds = (0, bounds[1], bounds[2], bounds[3])
        draw.rectangle(bounds, fill=(130 + number % 20, 60, 80, 255))
        image.save(self.folder / ("frame_" + str(number).zfill(2) + ".png"))

    def test_good_runtime_frames_and_packing(self):
        for number in range(1, 7):
            self.make_frame(number)
        result = qa.inspect(self.folder, "runtime", "idle", 6)
        self.assertTrue(result["pass"], result["errors"])
        self.assertFalse(result["warnings"], result["warnings"])
        self.assertEqual(len(result["frames"]), 6)
        out = self.folder / "packed"
        paths = qa.pack_frames(self.folder, result, out)
        self.assertEqual(len(paths), 1)
        with Image.open(paths[0]) as atlas:
            self.assertEqual(atlas.size, (1536, 1536))
            # Verify a 3x2 rectangular cut contains only the intended frame.
            for n in range(6):
                x = (n % 3) * 512
                y = (n // 3) * 768
                self.assertEqual(atlas.getpixel((x + 150, y + 100))[0], 131 + n)
                self.assertEqual(atlas.getpixel((x, y))[3], 0)

    def test_clipped_frame_is_rejected(self):
        self.make_frame(1, clipped=True)
        result = qa.inspect(self.folder)
        self.assertFalse(result["pass"])
        self.assertTrue(any("boundary" in x for x in result["errors"]))

    def test_opaque_background_is_rejected(self):
        self.make_frame(1, full=True)
        result = qa.inspect(self.folder)
        self.assertFalse(result["pass"])
        self.assertTrue(any("opaque" in x or "boundary" in x for x in result["errors"]))

    def test_gapped_indices_are_rejected(self):
        self.make_frame(1)
        self.make_frame(3)
        result = qa.inspect(self.folder)
        self.assertFalse(result["pass"])
        self.assertTrue(any("nonconsecutive" in x for x in result["errors"]))

    def test_tiny_source_warns(self):
        self.make_frame(1)
        result = qa.inspect(self.folder, mode="source")
        self.assertTrue(result["pass"])
        self.assertTrue(any("700px" in x for x in result["warnings"]))

    def test_valid_high_resolution_source(self):
        self.make_frame(1, source=True)
        result = qa.inspect(self.folder, mode="source")
        self.assertTrue(result["pass"], result["errors"])
        self.assertFalse(result["warnings"], result["warnings"])

    def test_twelve_frames_pack_as_two_parts(self):
        for number in range(1, 13):
            self.make_frame(number)
        result = qa.inspect(self.folder, expected_count=12)
        self.assertTrue(result["pass"], result["errors"])
        self.assertEqual(len(qa.pack_frames(self.folder, result, self.folder / "atlas")), 2)


if __name__ == "__main__":
    unittest.main()
