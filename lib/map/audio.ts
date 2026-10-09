import { Suno, type Voice } from '@joycostudio/suno'
import type { Disposer } from '@joycostudio/xyz'

export const MAP_AUDIO={
  paper:{src:'/map/audio/paper-fold.mp3',volume:.5,loop:true},
  writing:{src:'/map/audio/writing-pen.mp3',volume:.3,loop:true},
} as const

/** Scene-owned sound: optional assets never block the parchment experience. */
export function createMapAudio(disposer:Disposer){
  const suno=new Suno({manifest:MAP_AUDIO})
  const controller=new AbortController()
  let ready=false,disposed=false,focused=true
  let paper:Voice|undefined,writing:Voice|undefined
  void suno.loadAll({signal:controller.signal}).then(()=>{ready=true}).catch(()=>{})
  const stop=()=>{paper?.stop();writing?.stop();paper=writing=undefined}
  const unlock=()=>{if(!disposed)void suno.unlock().catch(()=>{})}
  disposer.listen(window,'pointerdown',unlock,{capture:true})
  disposer.listen(window,'keydown',unlock,{capture:true})
  disposer.listen(window,'blur',()=>{focused=false;stop()})
  disposer.listen(window,'focus',()=>{focused=true})
  disposer.listen(document,'visibilitychange',()=>{if(document.hidden)stop()})
  disposer.add(()=>{disposed=true;controller.abort();stop();void suno.dispose()})
  return {
    update(folding:boolean,inscribing:boolean){
      if(disposed||!ready||!suno.player.isRunning||document.hidden||!focused){stop();return}
      if(folding){if(!paper||paper.disposed)paper=suno.get('paper').play({exclusive:true})??undefined}
      else {paper?.stop();paper=undefined}
      if(inscribing){if(!writing||writing.disposed)writing=suno.get('writing').play({exclusive:true})??undefined}
      else {writing?.stop();writing=undefined}
    },
  }
}
