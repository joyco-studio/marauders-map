import { Disposer, edge } from "@joycostudio/xyz"
import { Warmup } from "@joycostudio/xyz/three"
import {
  AmbientLight, BackSide, BufferGeometry, Float32BufferAttribute, Color, DirectionalLight, Group, Mesh,
  MeshBasicNodeMaterial, MeshStandardNodeMaterial, OrthographicCamera,
  PerspectiveCamera, PlaneGeometry, Raycaster, RenderTarget, Scene,
  Vector2, type Node, WebGPURenderer, SRGBColorSpace, PCFShadowMap,
} from "three/webgpu"
import { mix, texture, uniform, uv, vec2, vec3, positionLocal, normalMap, smoothstep } from "three/tsl"
import { createText, type TextHandle, type TextEffect } from "lettra/three"
import { layout } from "lettra"
import { loadAssets } from "./assets"
import { sdfCoverage } from "./sdf"
import { createInk, type Ink } from "./ink"
import { mapPoint, mapSize, characters, elements, hotspots, labels, sheetPoint, routeAt, type Label, type RevealTiming } from "./data"
import { advance, clamp, smooth, transition, revealProgress, type MapState, type Phase, type Greeting, type Command } from "./state"
import { coverBlend } from "./cover"
import { foldPose } from "./folds"
import { createWand } from "./wand"
import type { Tuning } from "./debug"

export type Status = { phase:Phase; progress:number; discovered:boolean; backend:string; error?:string; greeting?:Greeting }
export type MapControls = { close:()=>void; open:()=>void; greet:(greeting:Greeting)=>void; discover:()=>void; zoom:(delta:number)=>void; resetView:()=>void; dispose:()=>void }
type Reveal = {ink:Ink; timing:RevealTiming}
type Footprint = {mesh:Mesh<PlaneGeometry,MeshBasicNodeMaterial>; ink:Ink; born:number}
type Panel = {index:number; hinge:Group; mesh:Mesh<PlaneGeometry,MeshStandardNodeMaterial>; side:number; depth:number}
const abort = () => new DOMException("Scene disposed","AbortError")

export async function startMap(container:HTMLElement,onStatus:(status:Status)=>void,signal:AbortSignal,retry=false):Promise<MapControls> {
  const disposer=new Disposer()
  const check=()=>{if(signal.aborted) throw abort()}
  let state:MapState={phase:"loading",enteredAt:0}
  let time=0, discovered=false, discoveredAt=0, progress=0
  const emit=()=>{if(!signal.aborted) onStatus({phase:state.phase,progress,discovered,backend,greeting:state.phase!=="error"?state.greeting:undefined,error:state.phase==="error"?state.message:undefined})}
  const syncPhase=edge((s:MapState)=>s.phase,()=>emit())
  let backend=""
  const tuning:Tuning={manual:false,fold:1,reveal:0,noise:1,light:2.4}
  try {
    const renderer=new WebGPURenderer({antialias:true,alpha:true,forceWebGL:new URLSearchParams(location.search).get("renderer")==="webgl"})
    disposer.add(()=>{renderer.setAnimationLoop(null);renderer.dispose();renderer.domElement.remove()})
    renderer.outputColorSpace=SRGBColorSpace
    renderer.shadowMap.enabled=true
    renderer.shadowMap.type=PCFShadowMap
    renderer.domElement.className="map-canvas"
    renderer.domElement.setAttribute("aria-label","Interactive Marauder’s Map. Drag to pan, scroll to zoom. Keyboard controls follow the canvas.")
    renderer.domElement.setAttribute("role","img")
    container.appendChild(renderer.domElement)
    await renderer.init(); check()
    backend=("isWebGPUBackend" in renderer.backend && renderer.backend.isWebGPUBackend)?"WebGPU":"WebGL2"
    const assets=await loadAssets(disposer,n=>{progress=n;emit()},retry);check()
    const noise=uniform(tuning.noise)
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
    const addText=(spec:Label,parent:Scene=mapScene,always=false) => {
      const heading=parent===coverScene&&spec.heading
      const font=heading?assets.font.cinzel:assets.font.tangerine
      const atlas=getTexture(heading?"fonts/cinzel-400.png":"fonts/tangerine-700.png")
      const text=heading?spec.text.toUpperCase():spec.text
      // Tangerine has a lower x-height; enlarge the script without moving its anchors.
      const scale=spec.size*(heading?1:1.65)/font.size/100
      const metrics=layout(font,text,{align:"center"})
      const measured=createInk(metrics.width*scale,metrics.height*scale,spec.center[0]*.07,noise)
      const handle=createText({font,map:atlas,text,layout:{align:"center"},geometry:{scale},material:{fill:"#593724",effect:measured.effect}})
      const [x,y]=sheetPoint(spec.center)
      handle.mesh.position.set(x,y,.04)
      handle.mesh.rotation.z=spec.angle??0
      parent.add(handle.mesh);textHandles.push(handle)
      disposer.add(()=>handle.dispose({map:false}))
      measured.progress.value=always?1:0
      if(!always)reveals.push({ink:measured,timing:{start:spec.start??1.3,duration:.85,seed:spec.center[0]}})
      return {handle,ink:measured,width:metrics.width*scale,height:metrics.height*scale}
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
    for(const label of labels)addText(label)
    const key=addDrawing("artwork/ornaments/antique_key.svg",mapSize([76*12/7,36*12/7]),mapPoint([1645,1040]),24)
    reveals.push({ink:key.ink,timing:{start:1.8,duration:.9,seed:24}})
    const passage=addDrawing("artwork/architecture/pasaje_secreto.svg",mapSize([2400,1200]),mapPoint([1200,600]),31)
    const secret=addText({text:"Dissendium",center:mapPoint([1630,150]),size:16,angle:-.12},mapScene,true)
    secret.ink.progress.value=0
    const note=addText({text:"A passage to Honeydukes",center:mapPoint([1640,175]),size:11},mapScene,true)
    note.ink.progress.value=0
    // Reusable static snapshot quad: updated only when ink/static discovery changes.
    const cachedMaterial=disposer.add(new MeshBasicNodeMaterial({transparent:true,depthWrite:false}))
    const cachedUV=vec2(uv().x,uv().y.oneMinus())
    cachedMaterial.colorNode=texture(staticTarget.texture,cachedUV).rgb
    cachedMaterial.opacityNode=texture(staticTarget.texture,cachedUV).a
    const cached=new Mesh(disposer.add(new PlaneGeometry(14,7)),cachedMaterial)
    cached.position.z=-.02;mapScene.add(cached);cached.visible=false

    const actors=characters.map((route,index)=> {
      const title=addText({text:route.name,center:route.points[0],size:12},mapScene,true)
      title.ink.progress.value=0
      // Draw each banner and its inscription together, so later banners occlude both.
      title.handle.mesh.renderOrder=3+index*2
      const variant=route.name.length>14?"largo":route.name.length>=12?"mediano":"corto"
      const legacyBannerWidth=variant==="mediano"?2:variant==="corto"?1.5:2.6
      const viewWidth=variant==="mediano"?620:variant==="corto"?420:840
      const bannerHeight=legacyBannerWidth*240/viewWidth
      const textScale=Math.min(1,(bannerHeight*.25-.025)/title.height)
      const bannerWidth=Math.max(.95,title.width*textScale+.42)
      const fitText=Math.min(1,(bannerWidth*(viewWidth-198)/viewWidth-.08)/title.width,(bannerHeight*.25-.025)/title.height)
      title.handle.mesh.scale.setScalar(fitText)
      const bannerInk=createInk(bannerWidth,bannerHeight,index+90,noise)
      const bannerMaterial=disposer.add(new MeshBasicNodeMaterial({transparent:true,depthWrite:false}))
      const base=`artwork/banners/banner_${variant}`
      const outline=assets.sdf[`${base}_contornos.svg`],silhouette=assets.sdf[`${base}_silueta.svg`]
      const outlineCoverage=sdfCoverage(getTexture(outline.texture),outline)
      const silhouetteCoverage=sdfCoverage(getTexture(silhouette.texture),silhouette)
      bannerMaterial.colorNode=mix(texture(getTexture(`${base}_color.png`)).rgb,bannerInk.pigment,outlineCoverage)
      bannerMaterial.opacityNode=silhouetteCoverage.mul(bannerInk.coverage)
      const banner=new Mesh(disposer.add(new PlaneGeometry(bannerWidth,bannerHeight)),bannerMaterial)
      banner.position.z=.035;banner.renderOrder=2+index*2;mapScene.add(banner)
      const footprints:Footprint[]=Array.from({length:20},(_,i)=> {
        const drawing=addDrawing(`artwork/ornaments/footprint_${i%2?"right":"left"}.svg`,[9,17.2],[700,350],index*20+i)
        drawing.mesh.position.z=.025
        drawing.ink.opacity.value=0
        return {...drawing,born:-100}
      })
      return {route,title,banner,bannerInk,footprints,step:0,lastStep:-1}
    })
    // Cover lives on the center panel and uses the same real MSDF lettering.
    const coverContent = {
      choices: [
        {text:"The Marauder's",center:[700,181],size:20,heading:true},
        {text:"Map",center:[700,222],size:35,heading:true},
        {text:"Reveal your secrets",center:[700,288],size:18},
        {text:"or",center:[700,308],size:11},
        {text:"I solemnly swear",center:[700,326],size:15},
        {text:"that I am up to no good",center:[700,342],size:13},
      ],
      welcome: [
        {text:"Messrs.",center:[700,158],size:14},
        {text:"Moony",center:[700,180],size:17,heading:true},
        {text:"Wormtail",center:[700,198],size:17,heading:true},
        {text:"Padfoot",center:[700,216],size:17,heading:true},
        {text:"& Prongs",center:[700,234],size:17,heading:true},
        {text:"are proud to present",center:[700,287],size:16},
        {text:"The Marauder's",center:[700,311],size:20,heading:true},
        {text:"Map",center:[700,336],size:26,heading:true},
      ],
      mockery: [
        {text:"Moony, Wormtail,",center:[700,170],size:17},
        {text:"Padfoot & Prongs",center:[700,190],size:17},
        {text:"send their compliments",center:[700,212],size:15},
        {text:"to Professor Snape",center:[700,234],size:16},
        {text:"...and request he keep",center:[700,283],size:15},
        {text:"his abnormally large nose",center:[700,302],size:14},
        {text:"out of other people's",center:[700,321],size:15},
        {text:"business.",center:[700,340],size:17},
      ],
    } satisfies Record<string, Label[]>
    const coverGroups = Object.fromEntries(Object.entries(coverContent).map(([name,content])=>[name,content.map(label=>addText(label,coverScene,true))]))
    const edgeHint = addText({text:"Pull an edge to unfold",center:[700,655],size:10},coverScene,true)
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

    // Paper rig: center fixed; both side chains fold back into a stack.
    const paper=new Group();paper.scale.setScalar(1.18);scene.add(paper)
    paper.rotation.z=-.028
    const panels:Panel[]=[]
    const coverAmount=uniform(1)
    const reliefAmount=uniform(0)
    const createPanel=(index:number,hinge:Group,offset:number,side:number,depth:number)=> {
      const geo=disposer.add(new PlaneGeometry(2.8,7,64,128))
      const positions=geo.attributes.position
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i),y=positions.getY(i)
        const curl=.025*Math.sin(y*.85+(x+(index-2)*2.8)*1.3)+.035*Math.pow(Math.abs(y)/3.5,8)
        positions.setZ(i,curl)
        // Ragged outer silhouette, extremely small to retain a coherent sheet.
        if(Math.abs(y)>3.49) positions.setY(i,y+Math.sin((x+(index-2)*2.8)*43)*.012)
      }
      geo.computeVertexNormals()
      const mat=disposer.add(new MeshStandardNodeMaterial({roughness:.96,metalness:0}))
      const mapUV=vec2(uv().x.div(5).add(index/5),uv().y)
      const base=texture(getTexture("parchment.jpg"),mapUV).rgb
      const targetUV=vec2(mapUV.x,mapUV.y.oneMinus())
      const coverUV=vec2(uv().x,uv().y.oneMinus())
      const mapInk=texture(target.texture,targetUV)
      const coverInk=texture(coverTarget.texture,coverUV)
      const print=index===2?mix(mapInk,coverInk,coverAmount):mapInk
      const crease=smoothstep(0,.035,uv().x).oneMinus().add(smoothstep(.965,1,uv().x)).mul(.1)
      mat.colorNode=mix(base,print.rgb,print.a).mul(crease.oneMinus())
      const displaced=(coordinates:Node<"vec2">)=>positionLocal.add(vec3(0,0,texture(getTexture("relief/main_unfolded_displacement_web_8bit.png"),coordinates).r.sub(.5).mul(.14).mul(reliefAmount)))
      mat.positionNode=displaced(mapUV)
      mat.normalNode=normalMap(texture(getTexture("relief/main_unfolded_normal_opengl.png"),mapUV).rgb,vec2(reliefAmount,reliefAmount))
      const front=new Mesh(geo,mat);front.position.set(offset,0,.013);front.castShadow=true;front.receiveShadow=true;hinge.add(front)
      const backMat=disposer.add(new MeshStandardNodeMaterial({roughness:1,side:BackSide}))
      backMat.colorNode=base.mul(.93)
      backMat.positionNode=displaced(mapUV)
      const back=new Mesh(geo,backMat);back.position.set(offset,0,-.015);back.castShadow=true;back.receiveShadow=true;hinge.add(back)
      const edgeMat=disposer.add(new MeshStandardNodeMaterial({color:"#a7804d",roughness:1}))
      // Only perimeter strips connect the curved faces. A solid box would poke
      // through curled paper and obscure the ink with large flat triangles.
      const perimeter:number[]=[]
      const grid=65
      for(let x=0;x<grid;x++)perimeter.push(x)
      for(let y=1;y<129;y++)perimeter.push(y*grid+64)
      for(let x=63;x>=0;x--)perimeter.push(128*grid+x)
      for(let y=127;y>0;y--)perimeter.push(y*grid)
      const edgeVertices:number[]=[]
      for(let i=0;i<perimeter.length;i++){
        const a=perimeter[i],b=perimeter[(i+1)%perimeter.length]
        const av=[positions.getX(a),positions.getY(a),positions.getZ(a)]
        const bv=[positions.getX(b),positions.getY(b),positions.getZ(b)]
        const af=[av[0],av[1],av[2]+.013],ab=[av[0],av[1],av[2]-.015]
        const bf=[bv[0],bv[1],bv[2]+.013],bb=[bv[0],bv[1],bv[2]-.015]
        edgeVertices.push(...af,...ab,...bf,...ab,...bb,...bf)
      }
      const edgeGeometry=disposer.add(new BufferGeometry())
      edgeGeometry.setAttribute("position",new Float32BufferAttribute(edgeVertices,3));
      const edgeUV:number[]=[]
      for(let i=0;i<edgeVertices.length;i+=3)edgeUV.push((edgeVertices[i]+1.4)/14+index/5,(edgeVertices[i+1]+3.5)/7)
      edgeGeometry.setAttribute("uv",new Float32BufferAttribute(edgeUV,2))
      edgeMat.positionNode=displaced(uv());edgeGeometry.computeVertexNormals()
      const edgeMesh=new Mesh(edgeGeometry,edgeMat);edgeMesh.position.x=offset;hinge.add(edgeMesh)
      const panel={index,hinge,mesh:front,side,depth};panels.push(panel);return panel
    }
    createPanel(2,paper,0,0,0)
    for(const side of [-1,1]){
      const inner=new Group();inner.position.set(side*1.4,0,0);paper.add(inner)
      createPanel(side<0?1:3,inner,side*1.4,side,1)
      const outer=new Group();outer.position.set(side*2.8,0,0);inner.add(outer)
      createPanel(side<0?0:4,outer,side*1.4,side,2)
    }
    scene.add(new AmbientLight("#f2dec4",1.7))
    const light=new DirectionalLight("#ffedce",tuning.light);light.position.set(-4,6,9);light.castShadow=true
    light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-9;light.shadow.camera.right=9;light.shadow.camera.top=6;light.shadow.camera.bottom=-6;light.shadow.normalBias=.04;scene.add(light)
    const floor=new Mesh(disposer.add(new PlaneGeometry(200,200)),disposer.add(new MeshStandardNodeMaterial({color:"#151714",roughness:1})))
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
      renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()
      const vertical=Math.tan(35*Math.PI/360)
      baseDistance=Math.max(5.65/vertical,10/(vertical*camera.aspect))
      updateCamera()
    }
    const observer=new ResizeObserver(fit);observer.observe(container);disposer.add(()=>observer.disconnect());fit()
    const foldPaper=(fold:number)=> {
      for(const panel of panels){
        if(!panel.side)continue
        const pose=foldPose(fold,panel.side,panel.depth)
        panel.hinge.rotation.y=pose.angle
        panel.hinge.position.z=pose.z
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
    for(const [content,cam,destination] of [[mapScene,mapCamera,target],[coverScene,coverCamera,coverTarget],[scene,camera,null]] as const){
      renderer.setRenderTarget(destination)
      const warmup=disposer.add(new Warmup({pause:()=>{},resume:()=>{},initTexture:t=>renderer.initTexture(t),compile:(s,c)=>renderer.compileAsync(s,c),render:()=>{renderer.render(content,cam)}}))
      await warmup.start(content,cam);check()
    }
    renderer.setRenderTarget(null)
    composite(coverTarget,coverScene,coverCamera)
    progress=1
    state=transition(state,"ready",time);syncPhase(state)
    let staticCached=false,staticDirty=true,actorTime=0
    const staticObjects=mapScene.children.filter(obj=>obj!==cached && !actors.some(a=>obj===a.title.handle.mesh||obj===a.banner||a.footprints.some(f=>obj===f.mesh)))
    const setStatic=(visible:boolean)=>staticObjects.forEach(obj=>{obj.visible=visible})
    const snapshot=()=> {
      for(const obj of staticObjects)staticScene.add(obj)
      composite(staticTarget,staticScene,mapCamera)
      for(const obj of staticObjects)mapScene.add(obj)
      setStatic(false);cached.visible=true;staticCached=true;staticDirty=false
    }
    const reset=()=> {
      actorTime=0
      discovered=false;staticCached=false;staticDirty=true;cached.visible=false;setStatic(true)
      zoom=1;panX=panY=0
      passage.ink.progress.value=0;secret.ink.progress.value=0;note.ink.progress.value=0
      for(const a of actors){a.step=0;a.lastStep=-1;a.title.ink.progress.value=0;a.bannerInk.progress.value=0;for(const f of a.footprints){f.born=-100;f.ink.opacity.value=0}}
    }
    const change=(command:Command)=> {
      const next=transition(state,command,time)
      if(next===state)return
      cast()
      if(command==="open")reset()
      if(command==="close"){staticCached=false;cached.visible=false;setStatic(true);zoom=1;panX=panY=0}
      state=next;syncPhase(state);emit()
    }
    const discover=()=> {
      if(state.phase!=="exploring"||state.greeting==="mockery"||discovered)return
      cast()
      discovered=true;discoveredAt=time;staticCached=false;cached.visible=false;setStatic(true);staticDirty=true;emit()
    }
    const zoomBy=(delta:number)=> {if(state.phase!=="exploring")return;cast();zoom=clamp(zoom+delta,1,2);if(zoom===1)panX=panY=0;updateCamera()}
    const resetView=()=>{cast();zoom=1;panX=panY=0;updateCamera()}
    const canvas=renderer.domElement
    const ray=new Raycaster(),pointer=new Vector2()
    const hit=(x:number,y:number)=> {
      const r=canvas.getBoundingClientRect();pointer.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1)
      ray.setFromCamera(pointer,camera)
      const intersection=ray.intersectObjects(panels.map(p=>p.mesh),false)[0]
      if(!intersection?.uv)return null
      const panel=panels.find(p=>p.mesh===intersection.object)!
      return {x:(panel.index+intersection.uv.x)*280,y:(1-intersection.uv.y)*700,point:intersection.point}
    }
    const hotspotAt=(x:number,y:number)=> {
      const p=hit(x,y);if(!p)return null
      if(state.phase==="folded") {
        if(state.greeting) return (p.x<587||p.x>813) ? "open" : null
        if(Math.abs(p.x-700)<115&&Math.abs(p.y-288)<13)return "mockery"
        if(Math.abs(p.x-700)<120&&p.y>315&&p.y<352)return "welcome"
        return null
      }
      return hotspots.find(h=> {
        if(h.id==="passage"&&state.phase!=="error"&&state.greeting==="mockery")return false
        if(h.id==="open"&&state.phase!=="folded")return false
        if(h.id!=="open"&&state.phase!=="exploring")return false
        return Math.abs(p.x-h.center[0])<h.radius[0]&&Math.abs(p.y-h.center[1])<h.radius[1]
      })?.id
    }
    const pointers=new Map<number,{x:number;y:number}>()
    let dragDistance=0,startX=0,startY=0,pinch=0
    disposer.listen<PointerEvent>(canvas,"pointerdown",e=> {
      if(state.phase!=="exploring"&&state.phase!=="folded")return
      const touch=hit(e.clientX,e.clientY);if(touch){wand.aim(touch.point);cast()}
      canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});startX=e.clientX;startY=e.clientY;dragDistance=0
      if(pointers.size===2){const [a,b]=[...pointers.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y)}
    })
    disposer.listen<PointerEvent>(canvas,"pointermove",e=> {
      const touch=hit(e.clientX,e.clientY)
      wandHover=!!touch&&e.pointerType!=="touch"
      if(touch)wand.aim(touch.point)
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
      }else canvas.style.cursor=hotspotAt(e.clientX,e.clientY)?"pointer":state.phase==="exploring"?"grab":"default"
    })
    disposer.listen<PointerEvent>(canvas,"pointerup",e=> {
      if(!pointers.has(e.pointerId))return
      pointers.delete(e.pointerId)
      if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)
      if(dragDistance>6||pointers.size)return
      const spot=hotspotAt(e.clientX,e.clientY)
      if(spot==="passage")discover()
      else if(spot==="close")change("close")
      else if(spot==="open"||spot==="mockery"||spot==="welcome")change(spot)
    })
    disposer.listen<PointerEvent>(canvas,"pointercancel",e=>{pointers.delete(e.pointerId);wandHover=false})
    disposer.listen(canvas,"pointerleave",()=>{wandHover=false})
    disposer.listen<WheelEvent>(canvas,"wheel",e=>{e.preventDefault();zoomBy(-e.deltaY*.001)},{passive:false})
    const controls:MapControls={close:()=>change("close"),open:()=>change("open"),greet:greeting=>change(greeting),discover,zoom:zoomBy,resetView,dispose:()=>disposer.dispose()}
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
      state=advance(state,time);syncPhase(state)
      const age=time-state.enteredAt
      let fold=0,reveal=3
      switch(state.phase){
        case "opening":fold=1-smooth(age/4);reveal=-1;break
        case "revealing":reveal=age;break
        case "erasing":reveal=3*(1-smooth(age));break
        case "closing":fold=smooth(age/3);reveal=-1;break
        case "folded":fold=1;reveal=-1;break
      }
      if(tuning.manual){fold=tuning.fold;reveal=tuning.reveal*3;staticCached=false;cached.visible=false;setStatic(true)}
      else{tuning.fold=fold;tuning.reveal=clamp(reveal/3)}
      noise.value=tuning.noise;light.intensity=tuning.light
      foldPaper(fold)
      const casting=["opening","revealing","erasing","closing"].includes(state.phase)
      paper.updateMatrixWorld(true)
      const wandPanels=panels.map(panel=>panel.mesh)
      wand.update(camera,dt,wandHover||pointers.size>0||time<castingUntil||casting,fold,wandPanels)
      updateCover()
      if(coverDirty){composite(coverTarget,coverScene,coverCamera);coverDirty=false}
      if(!staticCached)for(const entry of reveals)entry.ink.progress.value=revealProgress(reveal,entry.timing.start,entry.timing.duration)
      const erase=state.phase==="erasing"?1-smooth(age):state.phase==="closing"||state.phase==="folded"?0:1
      if(discovered){const p=revealProgress(time-discoveredAt,0,1.6)*erase;passage.ink.progress.value=p;secret.ink.progress.value=p;note.ink.progress.value=p}
      if(state.phase==="exploring")actorTime=age
      for(const actor of actors){
        const p=routeAt(actor.route,actorTime),[x,y]=sheetPoint(p.point)
        actor.title.handle.mesh.position.set(x,y+.5,.04)
        actor.banner.position.set(x,y+.5,.035)
        actor.title.ink.progress.value=(state.phase==="exploring"?revealProgress(age,0,.6):revealProgress(reveal,2.3,.7))*erase
        actor.bannerInk.progress.value=actor.title.ink.progress.value
        if(state.phase==="exploring"&&!tuning.manual){
          const currentStep=Math.floor(actorTime/.42)
          if(currentStep!==actor.lastStep){
            const f=actor.footprints[actor.step%actor.footprints.length]
            const lateral=(actor.step%2?1:-1)*.04
            f.mesh.position.set(x+Math.cos(p.angle)*lateral,y+Math.sin(p.angle)*lateral,.025)
            f.mesh.rotation.z=p.angle;f.born=time;actor.step++;actor.lastStep=currentStep
          }
        }
        for(const f of actor.footprints){const life=time-f.born;f.ink.progress.value=revealProgress(life,0,.25);f.ink.opacity.value=clamp(1-life/8)*erase}
      }
      if(state.phase==="exploring"&&!tuning.manual&&(!discovered||time-discoveredAt>1.6)&&staticDirty)snapshot()
      // During exploration only pooled dynamic prints/names are redrawn over the cached map.
      mapScene.visible=state.phase==="error"||state.greeting!=="mockery"
      composite(target,mapScene,mapCamera)
      renderer.setRenderTarget(null);renderer.setClearColor("#151714",1);renderer.render(scene,camera)
      frameCount++
      if(now-metricStart>2000){container.dataset.fps=(frameCount*1000/(now-metricStart)).toFixed(1);metricStart=now;frameCount=0}
    }
    renderer.setAnimationLoop(frame)
    disposer.add(()=>renderer.setAnimationLoop(null))
    emit()
    return controls
  }catch(error){disposer.dispose();throw error}
}
