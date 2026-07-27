# apechain-hero

Réplica técnica de estudio de [apechain.com](https://apechain.com/) (diseño original de OFF+BRAND para Ape Foundation), reconstruida desde cero en **WebGL2 puro, sin dependencias**.

> Proyecto educativo de ingeniería inversa de animaciones web. No afiliado a Ape Foundation. El arte de las cards es generado proceduralmente (el original pertenece a sus respectivos dueños) y la tipografía display es Anton en sustitución de la comercial manuka.

## Qué incluye

- **Hero**: carrusel 3D instanciado (5 cards curvadas sobre una elipse, geometría y matriz MVP medidas de la página real), fondo degradado animado con dither, anillos concéntricos que reaccionan al cursor con un muelle amortiguado simulado por transform feedback, drag con snap, autoplay 6.1 s.
- **Fondo global**: un único canvas fijo cuyo degradado cambia con el slide activo, se funde a blanco al salir del hero y a azul al llegar al footer (valores medidos).
- **Spotlight**: BackgroundCards con rotación 3D anidada y parallax, card 3D con aro degradado.
- **Grid de apps**: 268×273/gap 24 medidos, card destacada 2×2, arrastre horizontal, borde degradado en hover animado desde dos esquinas.
- **Cinta**: marquesinas por tiempo a 183 px/s (medido), hover azul.
- **Menús del nav**: paneles que descienden, velo backdrop-blur de 60 px, nav que se funde a negro con el scroll y se oculta/reaparece según la dirección.
- **Footer**: wordmark líquido con aberración cromática (3 pasadas RGB con desplazamientos distintos, técnica medida de la referencia).

## Correr

```bash
node serve.js
# → http://localhost:8080
```

Necesita servirse por HTTP (usa ES modules); cualquier servidor estático sirve.

## Archivos

| Archivo | Rol |
|---|---|
| `core.js` | Helpers WebGL2, estado compartido, sistema de partículas (transform feedback), geometrías, arte procedural |
| `bg.js` | Degradado fijo de página completa |
| `hero.js` | Carrusel instanciado + rings |
| `footer.js` | Wordmark con distorsión líquida y aberración cromática |
| `page.js` | Preloader, menús, marquesinas, grid, reveals, bucle maestro |
| `serve.js` | Servidor estático mínimo |
