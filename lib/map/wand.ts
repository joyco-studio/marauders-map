import type { Disposer } from "@joycostudio/xyz"
import {
  Box3, Group, Mesh, MeshBasicNodeMaterial, MeshStandardNodeMaterial, PerspectiveCamera,
  PointLight, Quaternion, SphereGeometry, Vector2, Vector3,
} from "three/webgpu"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"
import type { Assets } from "./assets"

/** The handle is the pivot; the exported wand's length runs along local +Y. */
export async function createWand(assets:Assets,disposer:Disposer) {
  const gltf=await new GLTFLoader().loadAsync("/map/wand/wand.glb")
  const wood=disposer.add(new MeshStandardNodeMaterial({
    map:assets.textures.get("wand/wand_basecolor.png"),
    normalMap:assets.textures.get("wand/wand_normal_opengl.png"),normalScale:new Vector2(.55,.55),
    roughnessMap:assets.textures.get("wand/wand_orm.png"),
    aoMap:assets.textures.get("wand/wand_orm.png"),aoMapIntensity:.5,
    metalness:0,roughness:.82,
  }))
  gltf.scene.traverse(obj=>{
    if(!(obj instanceof Mesh))return
    disposer.add(obj.geometry)
    const materials=Array.isArray(obj.material)?obj.material:[obj.material]
    for(const material of materials)material.dispose()
    obj.material=wood;obj.castShadow=true;obj.receiveShadow=true
  })
  const modelBounds=new Box3().setFromObject(gltf.scene)
  if(modelBounds.isEmpty())modelBounds.set(new Vector3(-.25,0,-.25),new Vector3(.25,4.765,.25))
  modelBounds.expandByScalar(.045)
  const modelCorners=Array.from({length:8},(_,i)=>new Vector3(
    i&1?modelBounds.max.x:modelBounds.min.x,
    i&2?modelBounds.max.y:modelBounds.min.y,
    i&4?modelBounds.max.z:modelBounds.min.z))
  const paperBounds=new Box3(),worldCorner=new Vector3()
  const root=new Group();root.name="Enchanted wand";root.add(gltf.scene)
  const tipMaterial=disposer.add(new MeshBasicNodeMaterial({color:"#ffe1a3",transparent:true,opacity:0,depthWrite:false}))
  const tip=new Mesh(disposer.add(new SphereGeometry(.045,12,8)),tipMaterial)
  tip.position.y=4.72;root.add(tip)
  const light=new PointLight("#ffcc7f",0,3,2);light.position.y=4.7;root.add(light)
  const target=new Vector3(0,.5,0),rest=new Vector3(),raised=new Vector3(),direction=new Vector3()
  const bounded=new Vector3(),candidate=new Vector3(),restTip=new Vector3(),endpoint=new Vector3(),offset=new Vector3()
  const yAxis=new Vector3(0,1,0),pose=new Quaternion(),restPose=new Quaternion().setFromAxisAngle(new Vector3(0,0,1),.12)
  let lift=0,initialized=false
  return {
    root,
    aim(point:Vector3){target.copy(point)},
    update(camera:PerspectiveCamera,dt:number,active:boolean,reduced:boolean,fold=0,panels:readonly Mesh[] = []) {
      // Project the resting handle from the viewport so pan/zoom cannot lose it.
      rest.set(.82,-.70,.5).unproject(camera)
      direction.copy(rest).sub(camera.position)
      rest.copy(camera.position).addScaledVector(direction,(-.15-camera.position.z)/direction.z)
      rest.x=camera.position.x+Math.min(rest.x-camera.position.x,3.4+6*(1-fold))
      const viewHeight=2*camera.position.z*Math.tan(camera.fov*Math.PI/360)
      const scale=viewHeight*(camera.aspect<1?.26:.43)/4.72
      root.scale.setScalar(scale)
      const desired=active&&!reduced?1:0
      lift=reduced?0:lift+(desired-lift)*(1-Math.exp(-dt*6))
      if(Math.abs(lift-desired)<.001)lift=desired
      raised.copy(rest);raised.y+=.65;raised.z+=3.8
      if(!initialized){root.position.copy(rest);root.quaternion.copy(restPose);initialized=true}
      // Clamp the commanded endpoint to real panel geometry, including hinges.
      let nearest=Infinity
      const aimPanels=fold>.98?panels.slice(0,1):panels
      for(const panel of aimPanels){
        candidate.copy(target);panel.worldToLocal(candidate)
        candidate.x=Math.max(-1.26,Math.min(1.26,candidate.x))
        candidate.y=Math.max(-3.34,Math.min(3.34,candidate.y))
        candidate.z=.06
        panel.localToWorld(candidate)
        const distance=candidate.distanceToSquared(target)
        if(distance<nearest){nearest=distance;bounded.copy(candidate)}
      }
      if(!panels.length)bounded.copy(target)
      // Lift along the camera ray: the glowing tip stays over the same ink point
      // in screen space even beside the map's outer edge.
      direction.copy(camera.position).sub(bounded).normalize()
      bounded.addScaledVector(direction,2.2)
      direction.copy(bounded).sub(raised).normalize()
      pose.setFromUnitVectors(yAxis,direction)
      pose.slerp(restPose,1-lift)
      root.quaternion.slerp(pose,reduced?1:1-Math.exp(-dt*10))
      restTip.copy(yAxis).applyQuaternion(restPose).multiplyScalar(4.72*scale).add(rest)
      endpoint.lerpVectors(restTip,bounded,lift)
      // Solve the handle from the tip after rotation smoothing, rather than
      // letting a fixed-length shaft overshoot a nearby target.
      offset.copy(yAxis).applyQuaternion(root.quaternion).multiplyScalar(4.72*scale)
      root.position.copy(endpoint).sub(offset)
      // Keep the WHOLE shaft and handle above the highest paper surface.
      // Moving along the endpoint's camera ray preserves the bounded tip's
      // screen projection while correcting actual 3D interpenetration.
      let paperTop=-Infinity
      for(const panel of panels){
        paperBounds.setFromObject(panel)
        paperTop=Math.max(paperTop,paperBounds.max.z)
      }
      let wandBottom=Infinity
      for(const corner of modelCorners){
        worldCorner.copy(corner).multiplyScalar(scale).applyQuaternion(root.quaternion).add(root.position)
        wandBottom=Math.min(wandBottom,worldCorner.z)
      }
      const clearance=paperTop+.9-wandBottom
      if(clearance>0){
        direction.copy(camera.position).sub(endpoint).normalize()
        if(direction.z>0)root.position.addScaledVector(direction,clearance/direction.z)
      }
      tipMaterial.opacity=lift*.8
      light.intensity=lift*1.2
      return lift!==desired
    },
  }
}
