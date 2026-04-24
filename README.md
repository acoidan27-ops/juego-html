# Skybound Quest

**Skybound Quest** es un juego web de plataformas 2D hecho con **HTML, CSS y JavaScript puro** usando **Canvas**. Está inspirado en los clásicos de "saltar y avanzar", pero con identidad visual original y sin usar recursos con copyright externos.

## Características

- Personaje principal original dibujado en Canvas.
- Movimiento lateral y salto con física básica (gravedad y colisiones).
- Plataformas, suelo, huecos y progreso por niveles.
- Enemigos que patrullan de lado a lado.
- Sistema de vidas.
- Cristales coleccionables con puntuación.
- Pantalla de inicio, game over y victoria.
- 3 niveles con dificultad progresiva.
- Reinicio rápido de nivel con teclado.
- Compatible con navegador y GitHub Pages.

## Cómo ejecutarlo en local

No necesitas instalar dependencias.

1. Descarga o clona este repositorio.
2. Abre el archivo `index.html` con doble clic en tu navegador.

> También puedes levantar un servidor estático opcional (por ejemplo con VS Code Live Server), pero no es obligatorio.

## Cómo publicarlo en GitHub Pages

1. Sube los archivos a un repositorio de GitHub.
2. Ve a **Settings** → **Pages**.
3. En **Build and deployment**, selecciona:
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` (o la rama que uses) y carpeta `/ (root)`
4. Guarda los cambios.
5. Espera 1–2 minutos y abre la URL pública que GitHub Pages te mostrará.

## Controles

- **Flecha izquierda** o **A**: moverse a la izquierda.
- **Flecha derecha** o **D**: moverse a la derecha.
- **Espacio** o **W**: saltar.
- **R**: reiniciar nivel actual.
- **Enter**: iniciar partida desde la pantalla inicial.

## Estructura de archivos

- `index.html`: estructura principal de la interfaz, HUD, canvas y pantallas de estado.
- `style.css`: estilos modernos, layout responsive y diseño visual.
- `script.js`: lógica completa del juego (física, niveles, colisiones, enemigos, puntuación y renderizado).
- `README.md`: documentación del proyecto.

## Ideas futuras para mejorar

- Añadir efectos de sonido y música **originales** opcionales.
- Guardado de récord de puntuación en `localStorage`.
- Soporte completo para controles táctiles en móvil.
- Más tipos de enemigos y power-ups.
- Sistema de checkpoints por nivel.
- Menú de pausa y selector de dificultad.

---

¡Listo para jugar y publicar en GitHub Pages! 🚀
