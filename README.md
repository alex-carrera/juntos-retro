# Soporte Tier 3 · Retro

[Repositorio público](https://github.com/alex-carrera/juntos-retro) · [Abrir el juego](https://alex-carrera.github.io/juntos-retro/) · [Servidor y juego en Render](https://juntos-retro.onrender.com)

[![Desplegar servidor en Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/alex-carrera/juntos-retro)

**Estado:** el servidor está desplegado en Render y `VITE_MULTIPLAYER_URL` está configurada en GitHub. Las salas en línea admiten hasta siete personas. La demo local con compañeros automáticos también está disponible.

Un juego web cooperativo para una retro de siete personas. Incluye seis niveles, personajes con nombre/color/accesorio, salas con enlace y QR, controles de teclado y táctiles, reconexión y una demo local con seis compañeros automáticos.

No hay cuentas, puntuaciones ni base de datos. El perfil se recuerda en el navegador; las salas y el progreso existen en la memoria del servidor y desaparecen cuando este se reinicia. El estado y la física se calculan en el servidor para que todos jueguen la misma partida. Capacidad: 2–7 personas por sala.

## Probar en la computadora

Requiere Node.js 20.19 o superior.

```sh
npm install
npm run dev
```

Abre `http://localhost:3000`. Para probar multijugador, usa pestañas o navegadores distintos. Cada pestaña recuerda su propia sesión. También puedes entrar desde un teléfono en la misma Wi-Fi usando la IP local de la computadora y el puerto 3000; el enlace/QR debe abrirse desde esa IP, no desde localhost. Permite el acceso de Node en el firewall si lo solicita.

La demo está claramente identificada: sus seis compañeros son automáticos y no se conecta a una sala en línea. Usa «Ver siguiente nivel» para revisar los seis retos sin completarlos primero.

## Jugar con el equipo

1. Cada persona entra con su propio dispositivo.
2. Una persona crea la sala y comparte el enlace o el código de cinco caracteres.
3. Espera a que se reúnan los siete y todos marquen «Estoy listo».
4. El anfitrión inicia. Puede reiniciar el nivel y avanzar al siguiente cuando lleguen todos a la salida.
5. Usen el audio de su llamada de retro para coordinarse; el juego no incluye voz ni chat.

Flechas o A/D para moverse. Espacio, W o flecha arriba para saltar. En pantallas táctiles aparecen botones. Se puede saltar sobre los compañeros.

- **Una chispa por persona:** cada jugador recoge su estrella de color. La puerta se abre cuando todos aportan la suya.
- **En la misma sintonía:** ocupen simultáneamente los siete botones durante algo más de un segundo. La puerta permanece abierta después.
- **El último empujón:** al menos la mitad del equipo, redondeando hacia arriba, camina hacia la derecha cerca del lado izquierdo del bloque. Con siete personas hacen falta cuatro. Empújenlo hasta la silueta marcada y reúnanse en la salida.

- **Un salto de confianza:** cruzad el río por las plataformas más estrechas. Cada persona recoge su chispa. La bandera guarda un punto de control individual; caer conserva las chispas recogidas.
- **Pasar el relevo:** el equipo activa sus botones en el orden indicado. Solo el dueño del botón puede activarlo, entrando con luz verde y manteniéndolo un instante. Si alguien esperaba encima antes de su turno o entra en rojo, debe salir y volver a entrar. Los relevos completados se conservan.
- **La gran sincronía:** cada jugador recoge su chispa y ocupa el botón de su color en una plataforma. Todos deben mantenerlos dos segundos a la vez. Hay río y un punto de control central; al abrirse la puerta, los siete deben cruzar hasta la salida.

Duración orientativa de la aventura completa: 20–30 minutos. Los tres primeros retos sirven para aprender; los tres nuevos exigen más precisión y coordinación.

Si alguien se desconecta, el juego se pausa hasta que vuelva. Se puede recargar la pestaña para reconectar. El anfitrión se transfiere a otra persona conectada cuando hace falta. El anfitrión puede continuar sin quienes se desconectaron; eso reinicia el nivel y ajusta los objetivos al equipo restante. No se admiten nuevos jugadores en medio de un nivel; vuelvan a la sala para reunir otro equipo.

## Publicar desde GitHub

El repositorio contiene todo el código. GitHub Pages publica la interfaz; el servidor multijugador necesita un servicio que ejecute Node y mantenga WebSockets. GitHub Pages por sí solo permite ver la demo, pero no alojar salas.

### 1. Servidor en Render

Conecta este repositorio a Render y crea un Web Service. `render.yaml` incluye la configuración, o configura manualmente:

- Build: `npm ci --include=dev && npm run build`
- Start: `npm start`
- Variable: `NODE_ENV=production`
- Node: 22
- Health check: `/health`

Render asignará una URL HTTPS. El servidor también sirve la web, así que esa URL puede usarse directamente sin Pages. El archivo propone el plan Free. Ese plan puede dormir tras 15 minutos de inactividad y tarda aproximadamente un minuto en despertar: abre el servicio antes de la retro. Revisa los límites del plan y tu cuenta antes de desplegar. Un reinicio del servidor borra las salas actuales. Usa una única instancia con este almacenamiento en memoria.

Opcionalmente configura `ALLOWED_ORIGINS` con los orígenes que pueden abrir conexiones, separados por comas (por ejemplo `https://tuusuario.github.io,https://tu-servicio.onrender.com`). Sin esa variable, acepta cualquier origen. La URL del servidor es pública; no contiene claves ni secretos.

### 2. Interfaz en GitHub Pages

1. Sube el proyecto a un repositorio de tu GitHub con rama `main`.
2. En Settings → Secrets and variables → Actions → Variables, crea `VITE_MULTIPLAYER_URL` con la URL HTTPS del servidor Render.
3. En Settings → Pages → Build and deployment, selecciona **GitHub Actions**.
4. Ejecuta el workflow «Publicar Soporte Tier 3 en GitHub Pages» o haz push a `main`.

La variable se incorpora al construir. Si cambia el servidor, vuelve a ejecutar el workflow. Vite usa rutas relativas para que funcione dentro de `usuario.github.io/repositorio/`.

## Validación

```sh
npm test
npm run build
npm start
```

Los tests cubren la lógica de cooperación, finalización, pausa al desconectarse y un recorrido de salas reales con siete conexiones WebSocket. Antes de la retro, prueba la URL publicada con un iPhone y un Android y haz una partida con el equipo: la latencia y el comportamiento táctil dependen de la red y del navegador. La interfaz se publica en GitHub Pages. Las salas en línea requieren configurar el servidor indicado arriba.
