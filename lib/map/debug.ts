import { DebugManager, property, slider, bool, button } from "@joycostudio/xyz/debug"
import { Pane } from "tweakpane"
export type Tuning = { manual: boolean; showPaths: boolean; fold: number; reveal: number; noise: number; light: number }
export function mountDebug(tuning: Tuning, reset:()=>void) {
  const debug = new DebugManager({createPane:()=>new Pane({title:"Makers’ Map"})})
  debug.bind({title:"Paper & ink",schema:()=>({
    showPaths:bool(property(tuning,"showPaths"),{label:"Show available paths"}),
    manual:bool(property(tuning,"manual")),
    fold:slider(property(tuning,"fold"),{min:0,max:1,step:.001}),
    reveal:slider(property(tuning,"reveal"),{min:0,max:1,step:.001}),
    noise:slider(property(tuning,"noise"),{min:0,max:2,step:.01}),
    light:slider(property(tuning,"light"),{min:.2,max:4,step:.05}),
    reset:button("Replay",reset),
  })})
  debug.enable()
  return debug
}
