# Skybound Quest

**Skybound Quest** es un juego web de plataformas 2D hecho con **HTML, CSS y JavaScript puro** usando **Canvas** + **Web Audio API** (sin librerías ni assets externos).

## Características

- Jugabilidad clásica de avanzar y saltar con gravedad y colisiones.
- Personaje, enemigos, plataformas y cristales dibujados en Canvas.
- 3 niveles con dificultad progresiva.
- Enemigos con patrulla lateral y eliminación por salto.
- Sistema de vidas, puntuación y transición de niveles.
- Pantallas de inicio, game over y victoria.
- Estética visual mejorada con:
  - parallax de montañas y nubes,
  - degradados, brillo y viñeta,
  - partículas en cristal, daño y fin de nivel.
- Sonido procedural (generado en tiempo real):
  - salto,
  - cristal,
  - daño,
  - completar nivel,
  - game over,
  - ambiente/música sencilla.
- Botón para activar/desactivar sonido.
- Controles táctiles para móvil (izquierda, derecha y salto) con pulsación mantenida.
- Compatible con navegador y GitHub Pages.

## Cómo ejecutarlo en local

1. Descarga o clona este repositorio.
2. Abre `index.html` directamente en tu navegador.

> No requiere instalación de dependencias.

## Cómo publicarlo en GitHub Pages

1. Sube el proyecto a un repositorio en GitHub.
2. Ve a **Settings** → **Pages**.
3. En **Build and deployment**:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` y carpeta `/ (root)`
4. Guarda y espera a que se publique la URL.

## Controles

- **Flecha izquierda** o **A**: moverse a la izquierda.
- **Flecha derecha** o **D**: moverse a la derecha.
- **Espacio** o **W**: saltar.
- **R**: reiniciar nivel actual.
- **Enter**: iniciar partida.
- **Botón de sonido**: activar/desactivar audio.
- **Botones táctiles en pantalla (móvil)**:
  - Flecha izquierda: mover izquierda.
  - Flecha derecha: mover derecha.
  - Botón SALTAR: salto rápido.

## Estructura de archivos

- `index.html`: estructura del HUD, canvas y overlays.
- `style.css`: estilo visual moderno, responsive y paneles.
- `script.js`: motor del juego, renderizado, efectos y audio procedural.
- `README.md`: documentación.

## Ideas futuras

- Añadir jefes finales por nivel.
- Guardar récord en `localStorage`.
- Añadir soporte táctil más avanzado para móvil.
- Sistema de checkpoints intermedios.
