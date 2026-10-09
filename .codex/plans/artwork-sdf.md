# Integración del paquete de arte con SDF

El estado anterior se incorporó por fast-forward a main en el checkout principal limpio. La integración continúa allí, sin renombrar la rama del workspace ni publicar cambios remotos.

1. Conservar los SVG originales y los metadatos del paquete, respetando sus coordenadas y accesos.
2. Hornear SDF monocanal desde cobertura vectorial rasterizada a alta resolución, con margen y rango documentados. Mantener formas superpuestas y huecos; las texturas de color de los banners permanecen separadas. Incorporar un comando reproducible de preparación.
3. Decodificar los campos en TSL con antialias adaptativo y compartir las revelaciones de tinta. Integrar arquitectura, portada, ornamentación, huellas y las tres variantes de banner.
4. Reubicar textos, rutas y hotspot del pasaje para que coincidan con los planos. Conservar el flujo de hechizos y cerrar/reabrir.
5. Regenerar el mapa estático y verificar geometría del SDF, typecheck, lint, pruebas relevantes, build y navegador WebGPU/WebGL2. Documentar el merge local, sin asumir autorización para publicar main en origin.

## Resultado y validación

Los cinco pasos están implementados. Se conservaron las fuentes SVG/JSON y las tres capas de color de banner, se generaron 31 campos monocanal y un manifiesto con coordenadas acolchadas, y se regeneró el fallback independiente. Las rutas siguen las conexiones del plano y el pasaje se revela sobre su capa registrada. La portada conserva Cinzel; el mapa desplegado usa Tangerine.

Typecheck, lint, ocho pruebas de estados, dos pruebas del generador SDF y build de producción pasaron. Los 31 campos reconstruyen exactamente la clasificación interior/exterior de sus fuentes rasterizadas. La comprobación visual en Chrome sobre MacBook Pro Apple M4 Pro cubre escritorio WebGPU y viewport 390 × 844 WebGL2, apertura, pasaje y cierre/reapertura. El viewport móvil es emulado: no constituye una medición en teléfono físico.

El merge y la integración permanecen locales en main, en `/Users/justkahdri/Documents/projects/marauders-map`, porque ese checkout ya posee la rama main. El workspace de Conductor conserva su rama original.

Muestreo aproximado: 144 fps enviados en WebGPU escritorio y 28,8 fps en WebGL2 con viewport móvil, sobre el mismo Mac. No mide tiempo GPU ni rendimiento de un teléfono; el detalle de la vista general móvil requiere zoom.
