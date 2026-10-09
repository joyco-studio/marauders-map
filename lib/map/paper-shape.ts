import { foldPose } from './folds'
import { smooth, clamp } from './state'

/** Integrate a continuous sheet centerline; crease radii produce stacking
 * clearance through actual paper bends, rather than disconnected offsets. */
export function paperShape(fold:number){
  const steps=1400,spacing=14/steps,half=steps/2
  const xs=new Float64Array(steps+1),zs=new Float64Array(steps+1),angles=new Float64Array(steps+1)
  const turns=[[-4.2,foldPose(fold,-1,2).angle,.10,-1],[-1.4,foldPose(fold,-1,1).angle,.10,-1],[1.4,foldPose(fold,1,1).angle,.27,1],[4.2,foldPose(fold,1,2).angle,.10,1]]
  const angle=(x:number)=>turns.reduce((sum,[hinge,rotation,radius,side])=>sum+rotation*smooth(clamp(((x-hinge)*side+radius)/(radius*2))),0)
  for(let i=0;i<=steps;i++)angles[i]=angle((i-half)*spacing)
  for(const direction of [-1,1])for(let n=1;n<=half;n++){
    const i=half+direction*n,previous=i-direction
    const theta=(angles[i]+angles[previous])/2
    xs[i]=xs[previous]+direction*spacing*Math.cos(theta)
    zs[i]=zs[previous]-direction*spacing*Math.sin(theta)
  }
  return (x:number,y:number,z:number)=>{
    const f=clamp((x+7)/spacing,0,steps),i=Math.min(steps-1,Math.floor(f)),a=f-i
    const theta=angles[i]+(angles[i+1]-angles[i])*a
    // Broad flexible bows vanish at shared creases, leaving seam coordinates exact.
    const panel=Math.min(4,Math.floor(clamp((x+7)/2.8,0,4.999)))
    const side=panel<2?-1:1,depth=panel===0||panel===4?2:1
    const rotation=panel===2?0:Math.abs(foldPose(fold,side,depth).angle)
    const u=clamp((x+7-panel*2.8)/2.8)
    const bow=.17*Math.sin(rotation)*Math.sin(Math.PI*u)**2*(.8+.2*Math.cos(y*.7))
    const lift=z+bow
    return [xs[i]+(xs[i+1]-xs[i])*a+Math.sin(theta)*lift,y,zs[i]+(zs[i+1]-zs[i])*a+Math.cos(theta)*lift] as const
  }
}
