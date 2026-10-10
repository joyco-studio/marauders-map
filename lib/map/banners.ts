import variations from '../../public/map/artwork/banners/variations.json'

export type BannerVariant={id:string;outline:string;silhouette:string;color:string;aspect:number;safeWidth:number;safeHeight:number}
export const bannerVariants:BannerVariant[]=[
  ...['corto','mediano','largo'].map((size,index)=>({
    id:size,outline:`artwork/banners/banner_${size}_contornos.svg`,silhouette:`artwork/banners/banner_${size}_silueta.svg`,color:`artwork/banners/banner_${size}_color.png`,
    aspect:[420,620,840][index]/240,safeWidth:([420,620,840][index]-198)/[420,620,840][index],safeHeight:.25,
  })),
  ...variations.variants.map(variant=>({
    id:variant.id,outline:`artwork/banners/${variant.id}_outlines.svg`,silhouette:`artwork/banners/${variant.id}_silhouette.svg`,color:`artwork/banners/${variant.id}_color.png`,
    aspect:variant.viewBox[2]/variant.viewBox[3],safeWidth:variant.text_safe_box.width/variant.viewBox[2],safeHeight:variant.text_safe_box.height/variant.viewBox[3],
  })),
]

/** Shuffled bag with leases: exiting banners keep their variant until hidden. */
export class BannerAssignments {
  private assigned=new Map<string,BannerVariant>()
  private bag:BannerVariant[]=[]
  constructor(private variants:readonly BannerVariant[]=bannerVariants,private random=Math.random) {}
  release(personId:string){this.assigned.delete(personId)}
  claim(personId:string) {
    const existing=this.assigned.get(personId)
    if(existing)return existing
    const used=new Set([...this.assigned.values()].map(variant=>variant.id))
    let index=this.bag.findIndex(variant=>!used.has(variant.id))
    if(index<0){
      this.bag=this.variants.filter(variant=>!used.has(variant.id))
      for(let i=this.bag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]]}
      index=0
    }
    const variant=this.bag.splice(index,1)[0]
    if(!variant)throw new Error('No unused banner variant available')
    this.assigned.set(personId,variant)
    return variant
  }
}
