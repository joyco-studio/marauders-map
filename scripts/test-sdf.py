import unittest
import numpy as np
from sdf import encode_sdf

class SdfContourTests(unittest.TestCase):
    def test_hole_and_exterior_remain_outside(self):
        alpha=np.zeros((40,40),dtype=np.uint8)
        alpha[5:35,5:35]=255
        alpha[15:25,15:25]=0
        sdf=encode_sdf(alpha)
        self.assertLess(sdf[0,0],128)
        self.assertLess(sdf[20,20],128)
        self.assertGreater(sdf[10,10],128)
        self.assertGreater(sdf[10,5],128)
        self.assertLess(sdf[10,4],128)

    def test_subpixel_boundary_and_range(self):
        alpha=np.zeros((20,20),dtype=np.uint8)
        alpha[4:16,4:16]=255
        alpha[3,5:15]=100
        sdf=encode_sdf(alpha)
        self.assertLess(sdf[3,10],128)
        self.assertGreater(sdf[4,10],128)
        self.assertEqual(sdf[10,10],255)
        self.assertEqual(sdf[0,0],0)

if __name__=='__main__':unittest.main()
