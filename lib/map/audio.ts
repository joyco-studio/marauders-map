import { Suno, type Voice } from '@joycostudio/suno'
import type { Disposer } from '@joycostudio/xyz'

export const MAP_AUDIO={
  paper:{src:'/map/audio/paper-fold.mp3',volume:.5,loop:true},
  writing:{src:'/map/audio/writing-pen.mp3',volume:.5,loop:true},
  // Measured source loudness: oath -22.9, closure -26.7, paper -28.7 LUFS.
  // These gains match both voices to the paper's ~-35 LUFS playback level.
  oath:{src:'/map/audio/i-solemnly.mp3',volume:.25},
  closure:{src:'/map/audio/mischief-managed.mp3',volume:.39},
} as const

/** Scene-owned sound: optional assets never block the parchment experience. */
export function createMapAudio(disposer:Disposer){
  const suno=new Suno({manifest:MAP_AUDIO})
  const controller=new AbortController()
  let ready=false,disposed=false,focused=true
  let paper:Voice|undefined,writing:Voice|undefined,speech:Voice|undefined
  let speechRequest=0
  const loading=suno.loadAll({signal:controller.signal}).then(()=>{ready=true}).catch(()=>{})
  const stop=()=>{paper?.stop();writing?.stop();paper=writing=undefined}
  const unlock=()=>{if(!disposed)void suno.unlock().catch(()=>{})}
  disposer.listen(window,'pointerdown',unlock,{capture:true})
  disposer.listen(window,'keydown',unlock,{capture:true})
  const stopSpeech=()=>{speechRequest++;speech?.stop();speech=undefined}
  disposer.listen(window,'blur',()=>{focused=false;stop();stopSpeech()})
  disposer.listen(window,'focus',()=>{focused=true})
  disposer.listen(document,'visibilitychange',()=>{if(document.hidden){stop();stopSpeech()}})
  disposer.add(()=>{disposed=true;controller.abort();stop();stopSpeech();void suno.dispose()})
  return {
    say(key:'oath'|'closure'){
      if(disposed)return
      const request=++speechRequest
      speech?.stop();speech=undefined
      // Unlock immediately in the command's gesture; await optional preloading.
      void Promise.all([suno.unlock(),loading]).then(()=>{
        if(disposed||request!==speechRequest||!ready||document.hidden||!focused)return
        speech=suno.get(key).play({exclusive:true})??undefined
      }).catch(()=>{})
    },
    update(folding:boolean,inscribing:boolean){
      if(disposed||!ready||!suno.player.isRunning||document.hidden||!focused){stop();return}
      if(folding){if(!paper||paper.disposed)paper=suno.get('paper').play({exclusive:true})??undefined}
      else {paper?.stop();paper=undefined}
      if(inscribing){if(!writing||writing.disposed)writing=suno.get('writing').play({exclusive:true})??undefined}
      else {writing?.stop();writing=undefined}
    },
  }
}
