"use client"

import { Disposer } from "@joycostudio/xyz"
import { useEffect, useRef } from "react"
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  Color,
  GridHelper,
  Mesh,
  MeshNormalMaterial,
  PerspectiveCamera,
  Scene as ThreeScene,
  WebGLRenderer,
} from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"

export function Scene() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const disposer = new Disposer()
    const renderer = new WebGLRenderer({ antialias: true })
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.domElement.style.display = "block"
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = "100%"
    container.appendChild(renderer.domElement)
    disposer.add(() => {
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    })

    const scene = new ThreeScene()
    scene.background = new Color("#1f2020")
    const camera = new PerspectiveCamera(50, 1, 0.1, 1000)
    camera.position.set(5, 5, 5)

    const geometry = new BoxGeometry()
    const material = new MeshNormalMaterial()
    const cube = new Mesh(geometry, material)
    cube.position.y = 0.5
    const grid = new GridHelper(10, 10)
    scene.add(cube, grid)
    disposer.add(geometry)
    disposer.add(material)
    disposer.add(grid)

    const controls = new OrbitControls(camera, renderer.domElement)
    disposer.add(controls)
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updateMotion = () => {
      controls.enableDamping = !reducedMotion.matches
    }
    updateMotion()
    disposer.listen(reducedMotion, "change", updateMotion)

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = container
      if (!width || !height) return
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    disposer.add(() => observer.disconnect())
    disposer.listen(window, "resize", resize)
    resize()

    renderer.setAnimationLoop(() => {
      controls.update()
      renderer.render(scene, camera)
    })
    disposer.add(() => renderer.setAnimationLoop(null))

    return () => disposer.dispose()
  }, [])

  return (
    <div ref={containerRef} id="webgl" className="fixed inset-0 h-dvh w-full" />
  )
}
