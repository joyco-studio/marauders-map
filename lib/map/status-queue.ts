export type StatusMessage = { key:string; onShown?:()=>void; onRemoved?:()=>void }
type Display<T> = { show:(message:T)=>void; hide:()=>void; isWritten:()=>boolean; isHidden:()=>boolean }

/** FIFO messages hold for three seconds after handwriting finishes. */
export class StatusQueue<T extends StatusMessage> {
  private pending:T[]=[]
  private current:T|null=null
  private phase:'idle'|'writing'|'holding'|'erasing'='idle'
  private held=0
  constructor(private display:Display<T>) {}
  enqueue(message:T) {
    if(this.current?.key===message.key||this.pending.some(item=>item.key===message.key))return
    this.pending.push(message)
    if(this.phase==='idle')this.next()
  }
  private next() {
    this.current=this.pending.shift()??null
    this.held=0
    this.phase=this.current?'writing':'idle'
    if(this.current){this.display.show(this.current);this.current.onShown?.()}
  }
  update(dt:number) {
    if(this.phase==='writing'&&this.display.isWritten()){
      this.phase='holding';this.held=0
    }else if(this.phase==='holding'){
      this.held+=Math.max(0,dt)
      if(this.held>=3){this.phase='erasing';this.display.hide()}
    }else if(this.phase==='erasing'&&this.display.isHidden()){
      this.current?.onRemoved?.();this.next()
    }
  }
}
