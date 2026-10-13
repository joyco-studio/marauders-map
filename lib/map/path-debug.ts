import { Group, Mesh, MeshBasicNodeMaterial, PlaneGeometry } from 'three/webgpu'
import { Disposer } from '@joycostudio/xyz'
import { availablePaths, passagePath, passageExitPath, waypoints } from '../activity/navigation'
import { mapPoint, sheetPoint, type Point } from './data'

/** Dynamic overlay: never included in the baked map snapshot. */
export function createPathDebug(disposer:Disposer) {
  const group=new Group(),normal=new Group(),secret=new Group()
  group.add(normal,secret);group.visible=false
  const markerGeometry=disposer.add(new PlaneGeometry(.045,.045))
  const lineGeometry=disposer.add(new PlaneGeometry(1,.012))
  const draw=(paths:readonly (readonly Point[])[],parent:Group,tint:string)=> {
    const material=disposer.add(new MeshBasicNodeMaterial({color:tint,transparent:true,opacity:.85,depthWrite:false,depthTest:false}))
    const points=new Set<string>(),segments=new Set<string>()
    for(const path of paths)for(const [index,point] of path.entries()) {
      const key=point.join(','),[x,y]=sheetPoint(point)
      if(!points.has(key)) {
        points.add(key)
        const marker=new Mesh(markerGeometry,material)
        marker.position.set(x,y,.07);marker.rotation.z=Math.PI/4;marker.renderOrder=1001;parent.add(marker)
      }
      if(!index)continue
      const previous=path[index-1],segment=[key,previous.join(',')].sort().join('|')
      if(segments.has(segment))continue
      segments.add(segment)
      const [a,b]=sheetPoint(previous),line=new Mesh(lineGeometry,material)
      line.position.set((x+a)/2,(y+b)/2,.065)
      line.rotation.z=Math.atan2(y-b,x-a);line.scale.x=Math.hypot(x-a,y-b);line.renderOrder=1000;parent.add(line)
    }
  }
  draw(availablePaths,normal,'#238b9c')
  // Highlight the revealed passage and its connection to the ordinary network.
  draw([passagePath,[...passageExitPath,mapPoint([1215,240]),waypoints.library]],secret,'#c94712')
  return {group,update:(show:boolean,discovered:boolean)=>{group.visible=show;secret.visible=discovered}}
}
