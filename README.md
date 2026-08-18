# 🃏 Casino — Aprende y Practica el Juego de Cartas

Una aplicación web interactiva, en español, para **aprender a jugar Casino** (el clásico juego de cartas de captura, también conocido como *Cassino*) y **practicar contra una IA** con partidas aleatorias hasta dominarlo.

👉 **[Jugar ahora](https://AAFW84.github.io/casino-card-game/)** *(disponible una vez activado GitHub Pages)*

No requiere instalación, cuentas, ni conexión a internet: es un único archivo HTML autocontenido (HTML + CSS + JavaScript puro, sin dependencias externas).

## ✨ Características

- **Tutorial guiado interactivo**: aprendes jugando de verdad, no solo leyendo. Cada paso te pide realizar la jugada correcta (captura simple, captura por suma, captura de figuras, construcciones y barridas) con retroalimentación inmediata.
- **Modo práctica con partidas aleatorias**: cada partida nueva reparte las cartas de forma distinta, para que enfrentes situaciones diferentes cada vez y vayas mejorando tu criterio.
- **Motor de reglas fiel al juego real**: incluye capturas simples, capturas por suma de varias cartas, capturas de figuras, construcciones simples y múltiples, la posibilidad de "robar" una construcción rival, la regla de obligación (no puedes descartar si tienes una construcción pendiente sin resolver), barridas y el reparto progresivo de cartas.
- **IA oponente** con una heurística que prioriza barridas, capturas de cartas valiosas (ases, 10♦, 2♠, espadas) y construcciones razonablemente seguras, con variación aleatoria para que cada partida se sienta distinta.
- **Botón de pista (💡)**: si no sabes qué jugar, te sugiere la mejor jugada disponible calculada por el mismo motor que usa la IA.
- **Reglas completas** siempre accesibles desde un panel, incluida la tabla oficial de puntuación.
- **Marcador y puntuación real**: partidas a 21 puntos, con el desglose completo de cada ronda (más cartas, más espadas, ases, Big Casino, Little Casino y barridas).

## 📖 Reglas resumidas

El objetivo es capturar cartas de la mesa combinándolas con las cartas de tu mano. En tu turno puedes:

1. **Capturar** una o varias cartas sueltas cuya suma sea igual al valor de tu carta, o una construcción completa con ese valor. Las figuras (J, Q, K) solo capturan a otra figura idéntica.
2. **Construir**: combinar tu carta con cartas de la mesa para crear una "construcción" con un valor que podrás capturar después (necesitas tener en la mano una carta capaz de hacerlo).
3. **Descartar** tu carta en la mesa, si no capturas ni construyes (con la excepción de que no puedes descartar si tienes una construcción propia pendiente que el rival no ha tocado).

Gana la partida quien llegue primero a 21 puntos, sumados ronda a ronda. El reglamento completo, con la tabla de puntuación, está disponible dentro de la propia aplicación (botón "📖 Reglas") y en [`RULES.md`](./RULES.md).

## 🚀 Cómo jugar localmente

Solo necesitas un navegador. Dos opciones:

```bash
# Opción 1: abrir el archivo directamente
open index.html      # macOS
xdg-open index.html  # Linux
start index.html      # Windows

# Opción 2: servirlo con cualquier servidor estático (recomendado para desarrollo)
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## 🧪 Pruebas automatizadas

El proyecto incluye una prueba end-to-end con [Playwright](https://playwright.dev/) que recorre el tutorial completo y juega varias partidas aleatorias de principio a fin, verificando que no haya errores de consola y que la conservación de cartas (52 en todo momento) se mantenga.

```bash
npm install playwright
node test/auto_test.js
```

## 🗂️ Estructura del proyecto

```
casino-card-game/
├── index.html        # Aplicación completa (motor de reglas, IA, interfaz y tutorial)
├── RULES.md           # Reglamento completo en español
├── test/
│   └── auto_test.js   # Prueba automatizada end-to-end (Playwright)
└── README.md
```

## 🛠️ Tecnología

Vanilla HTML, CSS y JavaScript — sin frameworks ni dependencias externas, para que el juego cargue instantáneamente y sea fácil de leer y modificar.

## 📄 Licencia

Este es un proyecto educativo de código abierto, publicado bajo la licencia MIT. Puedes usarlo, modificarlo y compartirlo libremente.
