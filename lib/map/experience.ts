import { createPathDebug } from "./path-debug"
import { createMapAudio } from "./audio"
import { Disposer, edge } from "@joycostudio/xyz"
import { Warmup } from "@joycostudio/xyz/three"
import {
  AmbientLight, BackSide, BufferGeometry, Float32BufferAttribute, Color, DirectionalLight, Group, Mesh,
  MeshBasicNodeMaterial, MeshStandardNodeMaterial, OrthographicCamera,
  PerspectiveCamera, PlaneGeometry, Raycaster, RenderTarget, Scene,
  Vector2, Vector3, Plane, type Node, WebGPURenderer, SRGBColorSpace, PCFShadowMap,
} from "three/webgpu"
import { sin, color, mix, texture, uniform, uv, vec2, vec3, positionLocal, normalLocal, normalMap, smoothstep } from "three/tsl"
import { msdfDistance, createText, type TextHandle, type TextEffect } from "lettra/three"
import { layout } from "lettra"
import { loadAssets } from "./assets"
import { sdfCoverage } from "./sdf"
import { createInk, type Ink } from "./ink"
import { mapPoint, mapSize, elements, hotspots, labels, sheetPoint, type Label, type RevealTiming } from "./data"
import { advance, shouldAutoOpen, clamp, smooth, transition, revealProgress, type MapState, type Phase, type Greeting, type Command } from "./state"
import { eligibleTrigger, resolveTrigger, type Trigger, type FocusedTrigger } from "./triggers"
import { coverBlend } from "./cover"
import { paperShape } from "./paper-shape"
import { createWand } from "./wand"
import { StatusQueue, type StatusMessage } from "./status-queue"
import { createInscription, arrivalMargin, type Inscription } from "./inscription"
import { createLivingBanner, readMotionPixels, bannerMetadata } from "./living-banner"
import { ActorPresentation } from "../activity/presentation"
import { MAX_RENDERED_PEOPLE } from "../activity/roster"
import { ActivityJourneys } from "../activity/journeys"
import type { ActivitySnapshot, ActivityEvent } from "../activity/types"
import type { Tuning } from "./debug"

export type Status = { phase:Phase; progress:number; discovered:boolean; visitorId?:string; backend:string; error?:string; greeting?:Greeting; hovered?:boolean }
export type Notice = Inscription & StatusMessage
export type MapControls = { setInscription:(value:Inscription|null)=>void; setNotice:(value:Notice|null)=>void; close:()=>void; open:()=>void; greet:(greeting:Greeting)=>void; discover:()=>void; zoom:(delta:number)=>void; resetView:()=>void; setFocusedTrigger:(target:FocusedTrigger|null)=>void; setActivity:(snapshot:ActivitySnapshot)=>void; dispose:()=>void }
type Reveal = {ink:Ink; timing:RevealTiming}
type Footprint = {mesh:Mesh<PlaneGeometry,MeshBasicNodeMaterial>; ink:Ink; born:number}
type Panel = {index:number; hinge:Group; mesh:Mesh<PlaneGeometry,MeshStandardNodeMaterial>; side:number; depth:number}
const abort = () => new DOMException("Scene disposed","AbortError")

export async function startMap(container:HTMLElement,onStatus:(status:Status)=>void,signal:AbortSignal,retry=false,onSelect?:(personId:string)=>void,onArrival?:(personId:string,event:ActivityEvent)=>void):Promise<MapControls> {
  const disposer=new Disposer()
  const audio=createMapAudio(disposer)
  const check=()=>{if(signal.aborted) throw abort()}
  let state:MapState={phase:"loading",enteredAt:0}
  let mapHovered=false
  let time=0, discovered=false, discoveredAt=0, progress=0
  const emit=()=>{if(!signal.aborted) onStatus({phase:state.phase,progress,discovered,visitorId:discovered?visitorId:undefined,backend,hovered:mapHovered,greeting:state.phase!=="error"?state.greeting:undefined,error:state.phase==="error"?state.message:undefined})}
  const syncPhase=edge((s:MapState)=>s.phase,()=>emit())
  let visitorId:string|undefined
  let backend=""
  const tuning:Tuning={manual:false,showPaths:false,fold:1,reveal:0,noise:1,light:1.5}
  try {
    const renderer=new WebGPURenderer({antialias:true,alpha:true,forceWebGL:new URLSearchParams(location.search).get("renderer")==="webgl"})
    disposer.add(()=>{renderer.setAnimationLoop(null);renderer.dispose();renderer.domElement.remove()})
    // A transparent foreground canvas puts the wand above HTML labels as well as map ink.
    const wandRenderer=new WebGPURenderer({antialias:true,alpha:true,forceWebGL:new URLSearchParams(location.search).get("renderer")==="webgl"})
    wandRenderer.domElement.className="wand-canvas"
    wandRenderer.domElement.setAttribute("aria-hidden","true")
    ;(container.parentElement??container).appendChild(wandRenderer.domElement)
    disposer.add(()=>{wandRenderer.dispose();wandRenderer.domElement.remove()})
    await wandRenderer.init();check()
    wandRenderer.outputColorSpace=SRGBColorSpace
    wandRenderer.setClearColor(0,0)
    const wandCamera=new PerspectiveCamera()
    renderer.outputColorSpace=SRGBColorSpace
    renderer.shadowMap.enabled=true
    renderer.shadowMap.type=PCFShadowMap
    renderer.domElement.className="map-canvas"
    renderer.domElement.setAttribute("aria-label","Interactive Makers’ Map. Drag to pan, scroll to zoom. Keyboard controls follow the canvas.")
    renderer.domElement.setAttribute("role","img")
    container.appendChild(renderer.domElement)
    await renderer.init(); check()
    backend=("isWebGPUBackend" in renderer.backend && renderer.backend.isWebGPUBackend)?"WebGPU":"WebGL2"
    const assets=await loadAssets(disposer,n=>{progress=n;emit()},retry);check()
    const noise=uniform(tuning.noise)
    const emberClock=uniform(0)
    const emberField=(seed:number)=>{
      const broad=sin(positionLocal.x.mul(8).sub(emberClock.mul(.8)).add(seed)).mul(sin(positionLocal.y.mul(15).add(emberClock.mul(.5)).add(seed*.7)))
      const fine=sin(positionLocal.x.mul(37).add(positionLocal.y.mul(29)).sub(emberClock.mul(1.4)).add(seed*2))
      return smoothstep(-.25,.65,broad.mul(.7).add(fine.mul(.3)))
    }
    const scene=new Scene()
    const camera=new PerspectiveCamera(35,1,.1,100)
    const wand=await createWand(assets,disposer);check();scene.add(wand.root)
    let wandHover=false,castingUntil=0
    const cast=()=>{castingUntil=time+1.5}
    const mapScene=new Scene(),coverScene=new Scene(),staticScene=new Scene()
    const mapCamera=new OrthographicCamera(-7,7,3.5,-3.5,.1,10);mapCamera.position.z=5
    const coverCamera=new OrthographicCamera(-1.4,1.4,3.5,-3.5,.1,10);coverCamera.position.z=5
    const mobile=matchMedia("(max-width: 700px)").matches
    const resolution=mobile?2048:4096
    const target=disposer.add(new RenderTarget(resolution,resolution/2,{depthBuffer:false}))
    const staticTarget=disposer.add(new RenderTarget(resolution,resolution/2,{depthBuffer:false}))
    const coverTarget=disposer.add(new RenderTarget(1024,2048,{depthBuffer:false}))
    const getTexture=(key:string)=>{const result=assets.textures.get(key);if(!result) throw new Error(`Missing texture: ${key}`);return result}
    const reveals:Reveal[]=[]
    const geometry=disposer.add(new PlaneGeometry(1,1))
    const textHandles:TextHandle<TextEffect>[]=[]
    const addText=(spec:Label,parent:Scene=mapScene,always=false,magical=false) => {
      const heading=parent===coverScene&&spec.heading
      const font=magical?assets.font.bethEllen:heading?assets.font.fondamento:assets.font.tangerine
      const atlas=getTexture(magical?"fonts/beth-ellen-400.png":heading?"fonts/fondamento-italic-400.png":"fonts/tangerine-700.png")
      const text=heading?spec.text.toUpperCase():spec.text
      // Tangerine has a lower x-height; enlarge the script without moving its anchors.
      const scale=spec.size*(magical?1.25:heading?1:1.65)/font.size/100
      const metrics=layout(font,text,{align:"center"})
      const measured=createInk(metrics.width*scale,metrics.height*scale,spec.center[0]*.07,noise)
      const glow=uniform(0)
      const heat=emberField(spec.center[0]*.07)
      if(magical)measured.effect.stages!.color=()=>mix(measured.pigment,mix(color("#a63610"),color("#ff9638"),heat),glow)
      const handle=createText({font,map:atlas,text,layout:{align:"center"},geometry:{scale},material:{fill:"#593724",effect:measured.effect}})
      const [x,y]=sheetPoint(spec.center)
      handle.mesh.position.set(x,y,.04)
      handle.mesh.rotation.z=spec.angle??0
      parent.add(handle.mesh);textHandles.push(handle)
      disposer.add(()=>handle.dispose({map:false}))
      measured.progress.value=always?1:0
      if(!always)reveals.push({ink:measured,timing:{start:spec.start??1.3,duration:.85,seed:spec.center[0]}})
      return {handle,glow,heat,ink:measured,width:metrics.width*scale,height:metrics.height*scale}
    }
    const addDrawing=(src:string,size:readonly[number,number],center:readonly[number,number],seed:number,parent:Scene=mapScene,revealCenter?:readonly[number,number])=> {
      const w=size[0]/100,h=size[1]/100
      const ink=createInk(w,h,seed,noise,revealCenter)
      const material=disposer.add(new MeshBasicNodeMaterial({transparent:true,depthWrite:false}))
      const entry=assets.sdf[src]
      if(!entry)throw new Error(`Missing SDF: ${src}`)
      material.colorNode=ink.pigment
      material.opacityNode=sdfCoverage(getTexture(entry.texture),entry).mul(ink.coverage).mul(ink.opacity)
      const mesh=new Mesh(geometry,material);mesh.scale.set(w,h,1)
      // positionLocal refers to unit-plane coordinates; use physical geometry for the radial field.
      mesh.geometry=disposer.add(new PlaneGeometry(w,h));mesh.scale.set(1,1,1)
      const [x,y]=sheetPoint(center);mesh.position.set(x,y,.01);parent.add(mesh)
      return {mesh,ink}
    }
    for(const element of elements){const drawing=addDrawing(element.src,element.size,element.center,element.timing.seed);reveals.push({ink:drawing.ink,timing:element.timing})}
    labels.forEach(label=>addText(label))
    const inscription=createInscription(disposer);mapScene.add(inscription.mesh)
    const notice=createInscription(disposer,arrivalMargin);mapScene.add(notice.mesh)
    const statusQueue=new StatusQueue<Notice>({show:value=>notice.set(placeInscription(value)),hide:()=>notice.set(null),isWritten:notice.isWritten,isHidden:notice.isHidden})
    const key=addDrawing("artwork/ornaments/antique_key.svg",mapSize([76*12/7,36*12/7]),mapPoint([1645,1040]),24)
    reveals.push({ink:key.ink,timing:{start:1.8,duration:.9,seed:24}})
    const passage=addDrawing("artwork/architecture/pasaje_secreto.svg",mapSize([2400,1200]),mapPoint([1200,600]),31)
    const secret=addText({text:"One more thing to try…",center:mapPoint([1635,35]),size:14},mapScene,true)
    secret.ink.progress.value=0
    const note=addText({text:"A passage to The Rabbit Hole",center:mapPoint([1635,105]),size:10},mapScene,true)
    note.ink.progress.value=0
    // Reusable static snapshot quad: updated only when ink/static discovery changes.
    const cachedMaterial=disposer.add(new MeshBasicNodeMaterial({transparent:true,depthWrite:false}))
    const cachedUV=vec2(uv().x,uv().y.oneMinus())
    cachedMaterial.colorNode=texture(staticTarget.texture,cachedUV).rgb
    cachedMaterial.opacityNode=texture(staticTarget.texture,cachedUV).a
    const cached=new Mesh(disposer.add(new PlaneGeometry(14,7)),cachedMaterial)
    cached.position.z=-.02;mapScene.add(cached);cached.visible=false

    const journeys=new ActivityJourneys()
    const pathDebug=new URLSearchParams(location.search).get("debug")==="true"?createPathDebug(disposer):undefined
    if(pathDebug)mapScene.add(pathDebug.group)
    let reservedVisitorIndex:number|undefined
    const motionPixels=readMotionPixels(getTexture("artwork/living-banner/motion_weights.png"))
    const actors=journeys.actors.map((simulation,index)=> {
      const title=addText({text:simulation.person.shortName,center:simulation.point,size:12},mapScene,true,true)
      title.ink.progress.value=0
      // Draw each banner and its inscription together, so later banners occlude both.
      title.handle.mesh.renderOrder=3+index*2
      // Soft MSDF halo follows the letters, rather than illuminating the whole tag.
      const haloMaterial=disposer.add(new MeshBasicNodeMaterial({transparent:true,depthWrite:false}))
      const glyphDistance=msdfDistance({msdf:texture(getTexture("fonts/beth-ellen-400.png"))})
      haloMaterial.colorNode=mix(color("#c94712"),color("#ff9a42"),title.heat)
      haloMaterial.opacityNode=smoothstep(.12,.52,glyphDistance).mul(title.glow).mul(title.heat.mul(.7).add(.3)).mul(.28).mul(title.ink.progress)
      const halo=new Mesh(title.handle.mesh.geometry,haloMaterial)
      halo.renderOrder=2.5+index*2;mapScene.add(halo)
      const safe=bannerMetadata.safe_text_box
      const safeWidth=safe[2]-safe[0],safeHeight=safe[3]-safe[1]
      // Preserve artwork proportions; fit the name inside its protected rectangle.
      const fitText=.8
      const bannerWidth=Math.max(1.25,(title.width*fitText+.10)/safeWidth,(title.height*fitText+.035)/(safeHeight*.75))
      const bannerHeight=bannerWidth*.75
      title.handle.mesh.scale.setScalar(fitText)
      const living=createLivingBanner(motionPixels,bannerWidth,index*1.71)
      disposer.add(living.geometry)
      const bannerInk=createInk(bannerWidth,bannerHeight,index+90,noise)
      const bannerMaterial=disposer.add(new MeshBasicNodeMaterial({transparent:true,depthWrite:false}))
      const artwork=texture(getTexture("artwork/living-banner/living_banner_color.png"))
      // A narrow alpha-gradient rim tracks the illustrated paper outline and curl holes.
      const bannerTexture=getTexture("artwork/living-banner/living_banner_color.png")
      const du=2/bannerMetadata.canvas_px[0],dv=2/bannerMetadata.canvas_px[1]
      const around=[vec2(du,0),vec2(-du,0),vec2(0,dv),vec2(0,-dv)].map(offset=>texture(bannerTexture,uv().add(offset)).a)
      const neighbors=around.reduce((a,b)=>a.min(b))
      const rim=artwork.a.sub(neighbors).max(0)
      const heat=emberField(index*1.71+9)
      const ember=mix(color("#b83b0c"),color("#ff9b39"),heat)
      bannerMaterial.colorNode=mix(artwork.rgb,ember,rim.mul(title.glow).mul(heat.mul(.65).add(.35)).mul(.8))
      bannerMaterial.opacityNode=artwork.a.mul(bannerInk.coverage).mul(bannerInk.opacity)
      const banner=new Mesh(living.geometry,bannerMaterial)
      banner.renderOrder=2+index*2;mapScene.add(banner)
      const textOffset=new Vector2(((safe[0]+safe[2])/2-.5)*bannerWidth,((safe[1]+safe[3])/2-.5)*bannerHeight)
      const footprints:Footprint[]=Array.from({length:20},(_,i)=> {
        const drawing=addDrawing(`artwork/ornaments/footprint_${i%2?"right":"left"}.svg`,[9,17.2],[700,350],index*20+i)
        drawing.mesh.position.z=.025
        drawing.ink.opacity.value=0
        return {...drawing,born:-100}
      })
      return {simulation,title,halo,banner,bannerInk,footprints,step:0,lastStep:0,bannerWidth,bannerHeight,textOffset,updateBanner:living.update}
    })
    const presentation=new ActorPresentation(journeys.actors.map(actor=>actor.point),MAX_RENDERED_PEOPLE)
    // Cover lives on the center panel and uses the same real MSDF lettering.
    const coverContent = {
      choices: [
        {text:"The Makers’",center:[700,181],size:20,heading:true},
        {text:"Map",center:[700,222],size:35,heading:true},
      ],
      welcome: [
        {text:"For those who turn",center:[700,180],size:14},
        {text:"strange ideas into pixels.",center:[700,205],size:13},
        {text:"The Makers’",center:[700,285],size:20,heading:true},
        {text:"Map",center:[700,316],size:26,heading:true},
      ],
    } satisfies Record<string, Label[]>
    const coverGroups = Object.fromEntries(Object.entries(coverContent).map(([name,content])=>[name,content.map(label=>addText(label,coverScene,true))]))
    const edgeHint = addText({text:"Press anywhere to unfold",center:[700,655],size:10},coverScene,true)
    let coverKey="", previousCover:string|null=null, coverChangedAt=0, coverDirty=true
    const updateCover=()=> {
      const key=state.phase==="folded"?state.greeting??"choices":coverKey||"choices"
      if(key!==coverKey){previousCover=coverKey||null;coverKey=key;coverChangedAt=time;coverDirty=true}
      const blend=previousCover?coverBlend(time-coverChangedAt):{outgoing:0,incoming:1,complete:true}
      for(const [name,items] of Object.entries(coverGroups))for(const item of items){
        item.handle.mesh.visible=name===key||name===previousCover
        item.ink.progress.value=name===key?blend.incoming:1
        item.ink.opacity.value=name===previousCover?blend.outgoing:1
      }
      edgeHint.handle.mesh.visible=key!=="choices"||previousCover!==null&&previousCover!=="choices"
      edgeHint.ink.progress.value=key==="choices"?1:blend.incoming
      edgeHint.ink.opacity.value=key==="choices"?blend.outgoing:1
      if(!blend.complete)coverDirty=true
      else previousCover=null
    }
    updateCover()
    const coverBorder=addDrawing("artwork/cover/enchanted_map_cover.svg",[280,700],[700,350],13,coverScene);coverBorder.ink.progress.value=1

    // Dynamic cover composition samples an independently cached base.
    const coverBase=disposer.add(new RenderTarget(1024,2048,{depthBuffer:false}))
    const coverOverlay=new Scene()
    const baseMaterial=disposer.add(new MeshBasicNodeMaterial({transparent:true,depthWrite:false}))
    baseMaterial.colorNode=texture(coverBase.texture,cachedUV).rgb
    baseMaterial.opacityNode=texture(coverBase.texture,cachedUV).a
    coverOverlay.add(new Mesh(disposer.add(new PlaneGeometry(2.8,7)),baseMaterial))
    const accents=new Group();mapScene.add(accents)
    let coverOverlayDirty=true
    const feedback: {target:Trigger;mesh:Mesh;opacity:ReturnType<typeof createInk>["opacity"];value:number;ink?:Ink}[]=[]
    const accent=(target:Trigger,points:number[],parent:Scene|Group,ink?:Ink)=> {
      const geo=disposer.add(new BufferGeometry())
      geo.setAttribute("position",new Float32BufferAttribute(points,3))
      const opacity=uniform(0)
      const material=disposer.add(new MeshBasicNodeMaterial({color:"#593724",transparent:true,depthWrite:false}))
      material.opacityNode=ink?opacity.mul(ink.coverage).mul(ink.opacity):opacity
      const mesh=new Mesh(geo,material);mesh.position.z=.08;mesh.renderOrder=100
      mesh.raycast=()=>{};parent.add(mesh)
      feedback.push({target,mesh,opacity,value:0,ink})
    }
    const stroke=(target:Trigger,path:number[][],parent:Scene|Group,width=.012,ink?:Ink)=> {
      const vertices:number[]=[]
      for(let i=1;i<path.length;i++){
        const [x,y]=path[i-1],[a,b]=path[i],length=Math.hypot(a-x,b-y)
        const dx=-(b-y)/length*width/2,dy=(a-x)/length*width/2
        vertices.push(x+dx,y+dy,0,x-dx,y-dy,0,a+dx,b+dy,0,x-dx,y-dy,0,a-dx,b-dy,0,a+dx,b+dy,0)
      }
      accent(target,vertices,parent,ink)
    }
    for(const side of [-1,1])stroke(side<0?"open-left":"open-right",Array.from({length:33},(_,i)=>[side*1.36+Math.sin(i*1.9)*.003,-3.42+i*6.84/32]),coverOverlay)
    const passageSpot=hotspots.find(h=>h.id==="passage")!
    const [keyX,keyY]=sheetPoint(passageSpot.center)
    for(let arc=0;arc<3;arc++)stroke("passage",Array.from({length:25},(_,i)=>{const angle=arc*Math.PI*2/3+i/24*1.65;return [keyX+Math.cos(angle)*.27,keyY+Math.sin(angle)*.27]}),accents,.012,key.ink)

    // Paper rig: center fixed; both side chains fold back into a stack.
    const paper=new Group();paper.scale.setScalar(1.18);scene.add(paper)
    paper.rotation.z=-.028
    const panels:Panel[]=[]
    const bending:{geometry:BufferGeometry;rest:Float32Array;index:number}[]=[]
    let previousFold=-1
    const coverAmount=uniform(1)
    const reliefAmount=uniform(0)
    const createPanel=(index:number,hinge:Group,offset:number,side:number,depth:number)=> {
      const geo=disposer.add(new PlaneGeometry(2.8,7,64,128))
      const positions=geo.attributes.position
      const cornerDelta=new Float32Array(positions.count*3)
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i),y=positions.getY(i)
        const curl=.025*Math.sin(y*.85+(x+(index-2)*2.8)*1.3)+.035*Math.pow(Math.abs(y)/3.5,8)
        positions.setZ(i,curl)
        if(index===4){
          // A cylindrical bend about x+y=3.7: the corner turns inward and
          // exposes its underside without cutting or duplicating the sheet.
          const distance=Math.max(0,(x+y-3.7)/Math.SQRT2)
          const radius=.14,angle=Math.min(2.8,distance/radius)
          const tail=Math.max(0,distance-radius*2.8)
          const inward=(radius*Math.sin(angle)+tail*Math.cos(angle)-distance)/Math.SQRT2
          const lift=radius*(1-Math.cos(angle))+tail*Math.sin(angle)
          cornerDelta.set([inward,inward,lift],i*3)
          positions.setXYZ(i,x+inward,y+inward,curl+lift)
        }
      }
      geo.setAttribute("cornerDelta",new Float32BufferAttribute(cornerDelta,3))
      geo.computeVertexNormals()
      const mat=disposer.add(new MeshStandardNodeMaterial({roughness:.96,metalness:0,alphaTest:.5}))
      const mapUV=vec2(uv().x.div(5).add(index/5),uv().y)
      const paperSample=texture(getTexture("paper/aged_paper_color_rgba.png"),mapUV)
      const base=paperSample.rgb
      mat.opacityNode=paperSample.a
      const targetUV=vec2(mapUV.x,mapUV.y.oneMinus())
      const coverUV=vec2(uv().x,uv().y.oneMinus())
      const mapInk=texture(target.texture,targetUV)
      const coverInk=texture(coverTarget.texture,coverUV)
      const print=index===2?mix(mapInk,coverInk,coverAmount):mapInk
      const crease=smoothstep(0,.035,uv().x).oneMinus().add(smoothstep(.965,1,uv().x)).mul(.1)
      mat.colorNode=mix(base,print.rgb,print.a).mul(crease.oneMinus())
      const displaced=(coordinates:Node<"vec2">)=>positionLocal.add(vec3(0,0,texture(getTexture("relief/main_unfolded_displacement_web_8bit.png"),coordinates).r.sub(.5).mul(.14).mul(reliefAmount)))
      mat.positionNode=displaced(mapUV).add(normalLocal.mul(.013))
      mat.normalNode=normalMap(texture(getTexture("relief/main_unfolded_normal_opengl.png"),mapUV).rgb,vec2(reliefAmount,reliefAmount))
      const front=new Mesh(geo,mat);front.position.set(offset,0,0);front.castShadow=true;front.receiveShadow=true;hinge.add(front)
      const backMat=disposer.add(new MeshStandardNodeMaterial({roughness:1,side:BackSide,alphaTest:.5}))
      backMat.colorNode=base.mul(.93)
      backMat.positionNode=displaced(mapUV).sub(normalLocal.mul(.015))
      backMat.opacityNode=paperSample.a
      const back=new Mesh(geo,backMat);back.position.set(offset,0,0);back.castShadow=true;back.receiveShadow=true;hinge.add(back)
      const edgeMat=disposer.add(new MeshStandardNodeMaterial({color:"#a7804d",roughness:1}))
      // Only perimeter strips connect the curved faces. A solid box would poke
      // through curled paper and obscure the ink with large flat triangles.
      const perimeter:number[]=[]
      const grid=65
      for(let x=0;x<grid;x++)perimeter.push(x)
      for(let y=1;y<129;y++)perimeter.push(y*grid+64)
      for(let x=63;x>=0;x--)perimeter.push(128*grid+x)
      for(let y=127;y>0;y--)perimeter.push(y*grid)
      const edgeVertices:number[]=[],edgeUV:number[]=[],edgeDelta:number[]=[]
      for(let i=0;i<perimeter.length;i++){
        const a=perimeter[i],b=perimeter[(i+1)%perimeter.length]
        const av=[positions.getX(a),positions.getY(a),positions.getZ(a)]
        const bv=[positions.getX(b),positions.getY(b),positions.getZ(b)]
        const af=[av[0],av[1],av[2]+.013],ab=[av[0],av[1],av[2]-.015]
        const bf=[bv[0],bv[1],bv[2]+.013],bb=[bv[0],bv[1],bv[2]-.015]
        edgeVertices.push(...af,...ab,...bf,...ab,...bb,...bf)
        for(const vertex of [a,a,b,a,b,b]){
          const originalUV=geo.attributes.uv
          edgeUV.push(originalUV.getX(vertex)/5+index/5,originalUV.getY(vertex))
          edgeDelta.push(cornerDelta[vertex*3],cornerDelta[vertex*3+1],cornerDelta[vertex*3+2])
        }
      }
      const edgeGeometry=disposer.add(new BufferGeometry())
      edgeGeometry.setAttribute("position",new Float32BufferAttribute(edgeVertices,3));
      edgeGeometry.setAttribute("cornerDelta",new Float32BufferAttribute(edgeDelta,3))
      edgeGeometry.setAttribute("uv",new Float32BufferAttribute(edgeUV,2))
      edgeMat.positionNode=displaced(uv());edgeMat.opacityNode=texture(getTexture("paper/aged_paper_color_rgba.png"),uv()).a;edgeMat.alphaTest=.5;edgeGeometry.computeVertexNormals()
      const edgeMesh=new Mesh(edgeGeometry,edgeMat);edgeMesh.position.x=offset;hinge.add(edgeMesh)
      bending.push({geometry:geo,rest:Float32Array.from(geo.attributes.position.array),index},{geometry:edgeGeometry,rest:Float32Array.from(edgeGeometry.attributes.position.array),index})
      const panel={index,hinge,mesh:front,side,depth};panels.push(panel);return panel
    }
    createPanel(2,paper,0,0,0)
    for(const side of [-1,1]){
      const inner=new Group();inner.position.set(side*1.4,0,0);paper.add(inner)
      createPanel(side<0?1:3,inner,side*1.4,side,1)
      const outer=new Group();outer.position.set(side*2.8,0,0);inner.add(outer)
      createPanel(side<0?0:4,outer,side*1.4,side,2)
    }
    const ambient=new AmbientLight("#f2dec4",.85);ambient.layers.enable(1);scene.add(ambient)
    const light=new DirectionalLight("#ffedce",tuning.light);light.position.set(-4,6,9);light.castShadow=true
    light.layers.enable(1)
    light.shadow.camera.layers.enable(1)
    light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-9;light.shadow.camera.right=9;light.shadow.camera.top=6;light.shadow.camera.bottom=-6;light.shadow.normalBias=.04;scene.add(light)
    const deskMaterial=disposer.add(new MeshStandardNodeMaterial({roughness:.95,metalness:0}))
    // Tile the 2:1 stone texture without stretching individual floor slabs.
    deskMaterial.colorNode=texture(getTexture("desk/castle-stone.png"),uv().mul(vec2(20,40))).rgb
    const floor=new Mesh(disposer.add(new PlaneGeometry(200,200)),deskMaterial)
    floor.position.z=-3.8;floor.receiveShadow=true;scene.add(floor)
    let zoom=1,panX=0,panY=0,baseDistance=15
    const updateCamera=(fold=0)=> {
      const tangent=Math.tan(35*Math.PI/360)
      const foldedDistance=Math.max(5.2/tangent,1.9/(tangent*camera.aspect))+2
      camera.position.set(panX,panY-3.5*fold,(baseDistance/zoom)*(1-fold)+foldedDistance*fold)
      camera.lookAt(panX,panY,0)
      camera.updateMatrixWorld()
    }
    const fit=()=> {
      const {clientWidth:w,clientHeight:h}=container
      if(!w||!h)return
      renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.5:2))
      renderer.setSize(w,h,false)
      wandRenderer.setPixelRatio(renderer.getPixelRatio());wandRenderer.setSize(w,h,false)
      camera.aspect=w/h;camera.updateProjectionMatrix()
      const vertical=Math.tan(35*Math.PI/360)
      baseDistance=Math.max(5.65/vertical,10/(vertical*camera.aspect))
      updateCamera()
    }
    const observer=new ResizeObserver(fit);observer.observe(container);disposer.add(()=>observer.disconnect());fit()
    const foldPaper=(fold:number)=> {
      if(Math.abs(previousFold-fold)>1e-6){
        const shape=paperShape(fold),cornerStrength=1-smooth(clamp(fold/.2))
        for(const {geometry,rest,index} of bending){
          const positions=geometry.attributes.position,corner=geometry.attributes.cornerDelta
          for(let i=0;i<positions.count;i++){
            const j=i*3
            const x=rest[j]-(corner?.getX(i)??0)*(1-cornerStrength)
            const y=rest[j+1]-(corner?.getY(i)??0)*(1-cornerStrength)
            const z=rest[j+2]-(corner?.getZ(i)??0)*(1-cornerStrength)
            const bent=shape(x+(index-2)*2.8,y,z)
            positions.setXYZ(i,bent[0]-(index-2)*2.8,bent[1],bent[2])
          }
          positions.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere()
        }
        previousFold=fold
      }
      coverAmount.value=smooth(clamp((fold-.2)/.6))
      reliefAmount.value=1-smooth(clamp(fold/.2))
      updateCamera(fold)
    }
    foldPaper(1)
    wand.update(camera,0,false,1,panels.map(panel=>panel.mesh))
    const composite=(destination:RenderTarget,content:Scene,cam:OrthographicCamera)=> {
      const previous=renderer.getRenderTarget()
      const clear=renderer.getClearColor(new Color()),alpha=renderer.getClearAlpha()
      renderer.setRenderTarget(destination);renderer.setClearColor(0,0);renderer.clear();renderer.render(content,cam)
      renderer.setRenderTarget(previous);renderer.setClearColor(clear,alpha)
    }
    // Both scenes get their own collector; cover uses the same text pipeline.
    for(const [content,cam,destination] of [[mapScene,mapCamera,target],[coverScene,coverCamera,coverBase],[coverOverlay,coverCamera,coverTarget],[scene,camera,null]] as const){
      renderer.setRenderTarget(destination)
      const warmup=disposer.add(new Warmup({pause:()=>{},resume:()=>{},initTexture:t=>renderer.initTexture(t),compile:(s,c)=>renderer.compileAsync(s,c),render:()=>{renderer.render(content,cam)}}))
      await warmup.start(content,cam);check()
    }
    renderer.setRenderTarget(null)
    composite(coverBase,coverScene,coverCamera)
    progress=1
    state=transition(state,"ready",time);syncPhase(state)
    let staticCached=false,staticDirty=true
    const staticObjects=mapScene.children.filter(obj=>obj!==pathDebug?.group && obj!==cached && obj!==accents && obj!==inscription.mesh && obj!==notice.mesh && !actors.some(a=>obj===a.title.handle.mesh||obj===a.halo||obj===a.banner||a.footprints.some(f=>obj===f.mesh)))
    const setStatic=(visible:boolean)=>staticObjects.forEach(obj=>{obj.visible=visible})
    const snapshot=()=> {
      for(const obj of staticObjects)staticScene.add(obj)
      composite(staticTarget,staticScene,mapCamera)
      for(const obj of staticObjects)mapScene.add(obj)
      setStatic(false);cached.visible=true;staticCached=true;staticDirty=false
    }
    const reset=()=> {
      journeys.resetPassage();visitorId=undefined
      discovered=false;staticCached=false;staticDirty=true;cached.visible=false;setStatic(true)
      zoom=1;panX=panY=0
      passage.ink.progress.value=0;secret.ink.progress.value=0;note.ink.progress.value=0
      for(const a of actors){a.step=0;a.lastStep=0;a.title.ink.progress.value=0;a.bannerInk.progress.value=0;for(const f of a.footprints){f.born=-100;f.ink.opacity.value=0}}
    }
    const change=(command:Command)=> {
      const next=transition(state,command,time)
      if(next===state)return
      cast()
      if(command==="welcome"){audio.say("oath");wand.enchant("ritual")}
      if(command==="open"){wand.enchant("swipe");reset()}
      if(command==="close"){audio.say("closure");staticCached=false;cached.visible=false;setStatic(true);zoom=1;panX=panY=0}
      clearHover();focused=null
      state=next;syncPhase(state);emit()
    }
    const discover=()=> {
      if(state.phase!=="exploring"||discovered)return
      cast()
      const hiddenIds=actors.filter((_,index)=>presentation.actors[index].phase==="hidden").map(actor=>actor.simulation.person.id)
      const visitor=journeys.revealPassage(hiddenIds)
      if(visitor){reservedVisitorIndex=journeys.actors.indexOf(visitor);visitorId=visitor.person.id}
      discovered=true;discoveredAt=time;staticCached=false;cached.visible=false;setStatic(true);staticDirty=true;emit()
    }
    const zoomBy=(delta:number)=> {if(state.phase!=="exploring")return;cast();zoom=clamp(zoom+delta,1,2);if(zoom===1)panX=panY=0;updateCamera()}
    const resetView=()=>{cast();zoom=1;panX=panY=0;updateCamera()}
    const canvas=renderer.domElement
    canvas.tabIndex=-1
    const ray=new Raycaster(),pointer=new Vector2()
    const hit=(x:number,y:number)=> {
      const r=canvas.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1)
      ray.setFromCamera(pointer,camera)
      const intersection=ray.intersectObjects(panels.map(p=>p.mesh),false)[0]
      if(!intersection?.uv)return null
      const panel=panels.find(p=>p.mesh===intersection.object)!
      return {x:(panel.index+intersection.uv.x)*280,y:(1-intersection.uv.y)*700,point:intersection.point}
    }
    let latest:{x:number;y:number}|null=null,hover:Trigger|null=null,focused:FocusedTrigger|null=null,suspended=false
    const clearHover=()=>{coverOverlayDirty=true;hover=null;for(const f of feedback){f.value=0;f.opacity.value=0}}
    const refreshHover=(point=latest?hit(latest.x,latest.y):null)=> {
      inscription.setHovered(!suspended&&!pointers.size?point:null)
      if(focused&&!eligibleTrigger(focused,state,discovered))focused=null
      const hovered=state.phase==="folded"&&!state.greeting&&!suspended&&(!!point||focused==="welcome")
      if(hovered!==mapHovered){mapHovered=hovered;emit()}
      hover=!suspended&&!pointers.size&&latest?resolveTrigger(point,state,discovered):null

    }
    const actorAt=(clientX:number,clientY:number)=> {
      if(state.phase!=="exploring")return
      const p=hit(clientX,clientY);if(!p)return
      // Match banner draw order, with passage/close hotspots always taking priority.
      return [...actors].reverse().find(actor=> {
        const sim=actor.simulation
        return (sim.eligible||sim===journeys.visitor)&&presentation.actors[actors.indexOf(actor)].phase==="shown"&&Math.abs(p.x-(actor.banner.position.x*100+700))<actor.bannerWidth*50&&Math.abs(p.y-(350-actor.banner.position.y*100))<Math.max(18,actor.bannerHeight*50)
      })?.simulation.person.id
    }
    const pointers=new Map<number,{x:number;y:number}>()
    let dragDistance=0,startX=0,startY=0,pinch=0
    disposer.listen<PointerEvent>(canvas,"pointerdown",e=> {
      if(state.phase!=="exploring"&&state.phase!=="folded")return
      clearHover();latest=e.pointerType!=="touch"?{x:e.clientX,y:e.clientY}:null;suspended=false
      const touch=hit(e.clientX,e.clientY);if(touch){wand.aim(touch.point);cast()}
      if(touch&&state.phase==="folded"&&state.greeting){change("open");return}
      canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});startX=e.clientX;startY=e.clientY;dragDistance=0
      if(pointers.size===2){const [a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y)}
    })
    disposer.listen<PointerEvent>(window,"pointermove",e=> {
      latest=e.pointerType!=="touch"?{x:e.clientX,y:e.clientY}:null;suspended=false
      const touch=hit(e.clientX,e.clientY)
      wandHover=e.pointerType!=="touch"
      const aim=new Vector3()
      ray.ray.intersectPlane(new Plane(new Vector3(0,0,1),0),aim)
      wand.aim(touch?.point??aim)
      const p=pointers.get(e.pointerId)
      if(p){
        const dx=e.clientX-p.x,dy=e.clientY-p.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY})
        dragDistance=Math.max(dragDistance,Math.hypot(e.clientX-startX,e.clientY-startY))
        if(pointers.size===2&&state.phase==="exploring"){
          const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y)
          zoomBy((distance-pinch)*.008);pinch=distance
        }else if(state.phase==="exploring"){
          const units=2*(baseDistance/zoom)*Math.tan(35*Math.PI/360)/container.clientHeight
              panX=clamp(panX-dx*units,-3.5,3.5);panY=clamp(panY+dy*units,-1.8,1.8);updateCamera()
        }
        clearHover()
      }else refreshHover(touch)
    })
    disposer.listen<PointerEvent>(canvas,"pointerup",e=> {
      if(!pointers.has(e.pointerId))return
      pointers.delete(e.pointerId)
      if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)
      const point=hit(e.clientX,e.clientY)
      if(dragDistance<=6&&!pointers.size){
        if(inscription.hit(point,true)){refreshHover(point);return}
        const spot=resolveTrigger(point,state,discovered)
        if(spot==="passage")discover()
        else if(spot==="open-left"||spot==="open-right")change("open")
        else if(spot)change(spot)
        else {const personId=actorAt(e.clientX,e.clientY);if(personId){canvas.focus();onSelect?.(personId)}}
      }
      const rect=canvas.getBoundingClientRect()
      latest=e.pointerType!=="touch"&&e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom?{x:e.clientX,y:e.clientY}:null
      refreshHover(point)
    })
    disposer.listen<PointerEvent>(canvas,"pointercancel",e=>{pointers.delete(e.pointerId);latest=null;wandHover=false;clearHover()})
    disposer.listen<PointerEvent>(document,"pointerout",e=>{if(!e.relatedTarget){latest=null;wandHover=false;clearHover()}})
    const suspend=()=>{suspended=true;focused=null;latest=null;pointers.clear();wandHover=false;clearHover()}
    disposer.listen(window,"blur",suspend)
    disposer.listen(document,"visibilitychange",()=>{if(document.hidden)suspend()})
    disposer.add(suspend)
    disposer.listen<WheelEvent>(canvas,"wheel",e=>{e.preventDefault();zoomBy(-e.deltaY*.001)},{passive:false})
    let nextGeneralSide:'left'|'right'='left'
    const placeInscription=<T extends Inscription>(value:T):T=>{
      const person=value.personId?journeys.actors.find(actor=>actor.person.id===value.personId):undefined
      const side=person?(person.point[0]<700?'left':'right'):nextGeneralSide
      if(!person)nextGeneralSide=side==='left'?'right':'left'
      return {...value,side}
    }
    let writer:typeof inscription|null=null
    const controls:MapControls={setInscription:value=>inscription.set(value?placeInscription(value):null),setNotice:value=>{if(value)statusQueue.enqueue(value)},setActivity:snapshot=>journeys.setActivity(snapshot),close:()=>change("close"),open:()=>change("open"),greet:greeting=>change(greeting),discover,zoom:zoomBy,resetView,setFocusedTrigger:target=>{suspended=false;focused=target;refreshHover()},dispose:()=>disposer.dispose()}
    if(new URLSearchParams(location.search).get("debug")==="true"){
      const {mountDebug}=await import("./debug");check()
      disposer.add(mountDebug(tuning,()=>{tuning.manual=false;reset();state={phase:"opening",enteredAt:time};syncPhase(state)}))
    }
    let previous=performance.now(),lastRender=0,metricStart=previous,frameCount=0
    const frame=(now:number)=> {
      if(signal.aborted){renderer.setAnimationLoop(null);return}
      if(document.hidden){previous=now;return}
      if(mobile&&now-lastRender<30)return
      lastRender=now
      const dt=Math.min((now-previous)/1000,.1);previous=now
      if(!tuning.manual)time+=dt
      const oldPhase=state.phase
      state=advance(state,time);syncPhase(state)
      if(!tuning.manual&&shouldAutoOpen(state,time))change("open")
      if(oldPhase!==state.phase)clearHover()
      const age=time-state.enteredAt
      let fold=0,reveal=3
      switch(state.phase){
        case "opening":fold=1-smooth(age/4);reveal=-1;break
        case "revealing":reveal=age;break
        case "erasing":reveal=3*(1-smooth(age));break
        case "closing":fold=smooth(age/3);reveal=-1;break
        case "enchanting":
        case "folded":fold=1;reveal=-1;break
      }
      if(tuning.manual){fold=tuning.fold;reveal=tuning.reveal*3;staticCached=false;cached.visible=false;setStatic(true)}
      else{tuning.fold=fold;tuning.reveal=clamp(reveal/3)}
      emberClock.value=time
      noise.value=tuning.noise;light.intensity=tuning.light
      foldPaper(fold)
      // Approach the desk only after unfolding; restore clearance while ink erases.
      const deskApproach=tuning.manual?(fold===0?1:0):state.phase==="revealing"?smooth(age/.8):state.phase==="exploring"?1:state.phase==="erasing"?1-smooth(age):0
      floor.position.z=-3.8+2.9*deskApproach
      const casting=["enchanting","opening","revealing","erasing","closing"].includes(state.phase)
      paper.updateMatrixWorld(true)
      const wandPanels=panels.map(panel=>panel.mesh)
      wand.update(camera,dt,wandHover||pointers.size>0||time<castingUntil||casting,fold,wandPanels)
      refreshHover()
      const selected=hover??(!suspended&&!pointers.size?focused:null)
      for(const f of feedback){
        const active=eligibleTrigger(f.target,state,discovered)&&(selected===f.target||selected==="open"&&f.target.startsWith("open-"))
        const previousValue=f.value
        if(!eligibleTrigger(f.target,state,discovered))f.value=0
        else f.value=clamp(f.value+dt*(active?1/.16:-1/.22))
        if(previousValue!==f.value&&f.mesh.parent===coverOverlay)coverOverlayDirty=true
        f.opacity.value=.65*f.value
      }
      if(writer&&!writer.isWriting())writer=null
      if(!writer)writer=inscription.isWriting()?inscription:notice.isWriting()?notice:null
      inscription.update(dt,writer===inscription)
      if(state.phase==="exploring"){notice.update(dt,writer===notice);statusQueue.update(dt)}
      audio.update(state.phase==="opening"||state.phase==="closing",state.phase==="exploring"&&(inscription.isWriting()||notice.isWriting()))
      updateCover()
      if(coverDirty){composite(coverBase,coverScene,coverCamera);coverDirty=false;coverOverlayDirty=true}
      if(coverOverlayDirty){composite(coverTarget,coverOverlay,coverCamera);coverOverlayDirty=false}
      if(!staticCached)for(const entry of reveals)entry.ink.progress.value=revealProgress(reveal,entry.timing.start,entry.timing.duration)
      const erase=state.phase==="erasing"?1-smooth(age):state.phase==="closing"||state.phase==="folded"?0:1
      if(discovered){const p=revealProgress(time-discoveredAt,0,1.6)*erase;passage.ink.progress.value=p;secret.ink.progress.value=p;note.ink.progress.value=p}
      const activityActive=state.phase==="exploring"&&!tuning.manual
      if(!tuning.manual)journeys.tick(dt,activityActive)
      if(!tuning.manual)for(const arrival of journeys.arrivals)onArrival?.(arrival.personId,arrival.event)
      const showPeople=(state.phase==="revealing"||state.phase==="exploring")
      pathDebug?.update(tuning.showPaths&&(state.phase==="revealing"||state.phase==="exploring"),discovered)
      presentation.update(dt,actors.map(actor=>({visible:showPeople&&actor.simulation.rendered,point:actor.simulation.point})),reservedVisitorIndex)
      if(!journeys.visitor&&reservedVisitorIndex!==undefined&&presentation.actors[reservedVisitorIndex].phase==="hidden")reservedVisitorIndex=undefined
      const hoveredPerson=!suspended&&!pointers.size&&latest?actorAt(latest.x,latest.y):undefined
      for(const [index,actor] of actors.entries()){
        const simulation=actor.simulation,appearance=presentation.actors[index]
        const [x,y]=sheetPoint(appearance.point)
        const visible=appearance.phase!=="hidden"
        actor.title.handle.mesh.visible=visible;actor.banner.visible=visible
        // Tags and footsteps share the same presented actor position, including exits.
        const labelX=x,labelY=y+.5
        actor.title.handle.mesh.position.set(labelX,labelY,.04)
        actor.banner.position.set(labelX-actor.textOffset.x,labelY-actor.textOffset.y,.035)
        if(visible)actor.updateBanner(time,appearance.progress)
        const glowTarget=visible&&hoveredPerson===simulation.person.id ? 1:0
        actor.title.glow.value+=(glowTarget-actor.title.glow.value)*(1-Math.exp(-dt*4.5))
        actor.halo.visible=visible&&actor.title.glow.value>.001
        actor.halo.position.copy(actor.title.handle.mesh.position)
        actor.halo.scale.copy(actor.title.handle.mesh.scale)
        actor.title.ink.progress.value=appearance.progress
        actor.title.ink.opacity.value=1
        actor.bannerInk.progress.value=appearance.progress
        actor.bannerInk.opacity.value=1
        if(activityActive&&appearance.phase!=="exiting"&&visible&&(simulation.passage&&simulation.delay===0||simulation.wander||simulation.journey&&simulation.journey.phase!=="arrival")){
          actor.lastStep+=dt
          if(actor.lastStep>=.42){
            const f=actor.footprints[actor.step%actor.footprints.length]
            const lateral=(actor.step%2?1:-1)*.04
            f.mesh.position.set(x+Math.cos(simulation.angle)*lateral,y+Math.sin(simulation.angle)*lateral,.025)
            f.mesh.rotation.z=simulation.angle;f.born=time;actor.step++;actor.lastStep=0
          }
        }
        for(const f of actor.footprints){
          if(!visible)f.born=-100
          const life=time-f.born;f.mesh.visible=visible&&life>=0&&life<8;f.ink.progress.value=revealProgress(life,0,.25);f.ink.opacity.value=clamp(1-life/8)*(appearance.phase==="exiting"?appearance.progress:1)
        }
      }
      if(state.phase==="exploring"&&!tuning.manual&&(!discovered||time-discoveredAt>1.6)&&staticDirty)snapshot()
      // During exploration only pooled dynamic prints/names are redrawn over the cached map.
      composite(target,mapScene,mapCamera)
      renderer.setRenderTarget(null);renderer.setClearColor("#151714",1);renderer.render(scene,camera)
      wandCamera.copy(camera);wandCamera.layers.set(1)
      wandRenderer.render(scene,wandCamera)
      frameCount++
      if(now-metricStart>2000){container.dataset.fps=(frameCount*1000/(now-metricStart)).toFixed(1);metricStart=now;frameCount=0}
    }
    renderer.setAnimationLoop(frame)
    disposer.add(()=>renderer.setAnimationLoop(null))
    emit()
    return controls
  }catch(error){disposer.dispose();throw error}
}
