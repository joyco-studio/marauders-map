import assert from "node:assert/strict"
import { test } from "node:test"
import { Mesh, PlaneGeometry, Vector3 } from "three/webgpu"
import { boundWandTarget } from "./wand-target"

test("wand target remains continuous across adjoining scaled panel edges",()=>{
  const panels=[new Mesh(new PlaneGeometry(2.8,7)),new Mesh(new PlaneGeometry(2.8,7))]
  panels.forEach((panel,i)=>{panel.scale.setScalar(1.18);panel.position.x=i*2.8*1.18;panel.updateMatrixWorld()})
  const out=new Vector3(),scratch=new Vector3(),seam=1.4*1.18
  for(const delta of [-.15,-.01,0,.01,.15]){
    boundWandTarget(new Vector3(seam+delta,0,0),panels,out,scratch)
    assert.ok(Math.abs(out.x-(seam+delta))<1e-10)
  }
  panels.forEach(panel=>panel.geometry.dispose())
})

test("target stays finite and on a rotated panel when commanded outside it",()=>{
  const panel=new Mesh(new PlaneGeometry(2.8,7));panel.rotation.y=1.2;panel.updateMatrixWorld()
  const out=boundWandTarget(new Vector3(10,10,10),[panel],new Vector3(),new Vector3())
  panel.worldToLocal(out)
  assert.ok(Math.abs(out.x)<=1.4+1e-10);assert.ok(Math.abs(out.y)<=3.5+1e-10)
  assert.ok(Math.abs(out.z-.06)<1e-10)
  panel.geometry.dispose()
})
