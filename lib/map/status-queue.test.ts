import assert from 'node:assert/strict'
import { test } from 'node:test'
import { StatusQueue, type StatusMessage } from './status-queue'

function harness() {
  let written=false,hidden=true
  const shown:string[]=[],removed:string[]=[]
  let exits=0
  const queue=new StatusQueue<StatusMessage>({
    show:message=>{shown.push(message.key);written=false;hidden=false},
    hide:()=>{exits++;written=false},
    isWritten:()=>written,isHidden:()=>hidden,
  })
  const enqueue=(key:string)=>queue.enqueue({key,onRemoved:()=>removed.push(key)})
  return {queue,enqueue,shown,removed,finishWriting:()=>{written=true;queue.update(0)},finishExit:()=>{hidden=true;queue.update(0)},get exits(){return exits}}
}

test('a burst of status messages is preserved in FIFO order through writing, hold, and exit',()=>{
  const h=harness()
  h.enqueue('first');h.enqueue('second');h.enqueue('third')
  assert.deepEqual(h.shown,['first'])
  h.queue.update(20)
  assert.equal(h.exits,0,'time spent writing cannot consume the readable hold')
  h.finishWriting()
  h.queue.update(2.999)
  assert.equal(h.exits,0)
  assert.deepEqual(h.shown,['first'])
  h.queue.update(.002)
  assert.equal(h.exits,1)
  h.queue.update(10)
  assert.deepEqual(h.shown,['first'],'the next message waits for the exit to finish')
  h.finishExit()
  assert.deepEqual(h.removed,['first'])
  assert.deepEqual(h.shown,['first','second'])
  h.finishWriting();h.queue.update(3);h.finishExit()
  assert.deepEqual(h.shown,['first','second','third'])
  h.finishWriting();h.queue.update(3);h.finishExit()
  assert.deepEqual(h.removed,['first','second','third'])
})

test('every newly displayed message receives its own full three-second hold',()=>{
  const h=harness()
  h.enqueue('first');h.enqueue('second')
  h.finishWriting();h.queue.update(100);h.finishExit()
  h.finishWriting();h.queue.update(2.99)
  assert.equal(h.exits,1)
  h.queue.update(.02)
  assert.equal(h.exits,2)
})

test('duplicate active or pending status messages do not occupy multiple queue slots',()=>{
  const h=harness()
  h.enqueue('first');h.enqueue('first');h.enqueue('second');h.enqueue('second')
  h.finishWriting();h.queue.update(3);h.finishExit()
  h.finishWriting();h.queue.update(3);h.finishExit()
  assert.deepEqual(h.shown,['first','second'])
  h.enqueue('first')
  assert.deepEqual(h.shown,['first','second','first'],'a later recurrence can be shown again')
})
