# Soporte Tier 3 · Retro

[Entrar al juego](https://alex-carrera.github.io/juntos-retro/) · [Repositorio](https://github.com/alex-carrera/juntos-retro) · [Servidor](https://juntos-retro.onrender.com)

Seis retos cooperativos para 2–7 personas, seguidos por un tablero de retrospectiva compartido. Android, iPhone y computadora desde el navegador. Sin cuentas de jugadores ni rankings.

## De la aventura a la retro

1. En el inicio elige **Jugar con el equipo** para crear una sala, comparte su enlace o QR y espera al equipo.
2. Todos marcan «Estoy listo» y quien facilita inicia.
3. Completen seis retos con cuerdas, caídas, agarres, cintas y ráfagas.
4. Cuando todos llegan a la última salida, el tablero de retro se abre automáticamente para todo el equipo.
5. Escriban ideas, voten y acuerden acciones. La retro queda guardada en Supabase.

Para saltarse la aventura, elige **Crear una retro** en el inicio: se abre un tablero compartido sin tener que completar niveles ni esperar a otra persona. Comparte su enlace privado para que entre el equipo. Puedes volver a tableros anteriores desde **Mis retrospectivas guardadas**.

Quien facilita también puede abrir el tablero desde la sala o el botón «Retro» durante un nivel, para respetar el tiempo de la reunión. Eso termina la aventura de esa sala. La demo local permite revisar juego y tablero con compañeros automáticos; sus notas no se guardan en la nube.

## Controles y cooperación

- Flechas o A/D: moverse.
- Espacio, W o flecha arriba: saltar.
- **E, mantenida:** agarrar a una persona cercana y frenar. Si está colgando de una cuerda, permite izarla. Agarrar y saltar ayuda a rescatarla. Suelta E para liberar un agarre manual; las cuerdas permanentes siguen uniendo al equipo.
- En celular aparecen botones de movimiento, salto y **Agarrar**. Usa orientación horizontal para ver mejor el escenario.
- Coordinen por el audio de su llamada; no hay voz ni chat en el juego.

### Seis niveles

1. **Unidos desde el inicio:** cuerdas por parejas, una chispa propia y la obligación de llegar juntos.
2. **Contra la corriente:** la cinta desplaza al equipo mientras todos deben sostener los botones. Agarrar/frenar permite mantener la posición.
3. **Arrastre en equipo:** una cadena de jugadores, un bloque pesado y ráfagas en contra.
4. **No sueltes la cuerda:** plataformas sobre un río con caídas reales. Quien queda arriba puede frenar e izar al compañero. Si todo el grupo conectado cae demasiado, vuelve al último punto de control que alcanzaron todos; las chispas recogidas se conservan.
5. **Relevo en movimiento:** turnos con luz verde sobre una cinta transportadora. El dueño entra y sostiene su botón; si esperaba encima antes de su turno, debe salir y volver a entrar.
6. **Todos o ninguno:** una cadena completa cruza el río y mantiene los botones de color a distintas alturas durante dos segundos, resistiendo el viento.

Las salas de juego viven en memoria: se pausan ante una desconexión y permiten volver al recargar la pestaña. Un reinicio del servidor borra las partidas en curso. El historial de retro se guarda por separado y sobrevive a esos reinicios.

## El tablero de retro

Tres columnas: **Lo que funcionó**, **Podemos mejorar** y **Próximos pasos**. Cada participante escribe tarjetas y edita las suyas; quien facilita puede ordenar y editar las del equipo.

- Etapas: Escribir → Votar → Acordar acciones → Cerrada. Quien facilita puede reabrirla.
- Tres votos por persona; se pueden retirar para cambiar de idea.
- Acciones con responsable y estado pendiente/hecha.
- Búsqueda, título editable y descarga de notas en Markdown.
- Tres pistas relajantes incluidas en la web, una por columna: **Dream Culture**, **Meditation Impromptu 01** y **Easy Lemon**, de Kevin MacLeod, bajo [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Los créditos y las fuentes están en el tablero y en `public/audio/CREDITS.md`. No se abre Spotify ni se requiere una cuenta de música.
- Historial guardado y reapertura desde «Mis retrospectivas guardadas».
- El enlace privado del tablero permite que el squad vuelva a leer y participar. Guárdenlo en un lugar compartido de confianza.

### Cinco minutos por punto

1. En **Lo que funcionó**, quien facilita pulsa **Empezar 5 minutos**. Se habilita esa columna y empieza la música.
2. Cada participante toca **Activar música** una vez en su dispositivo. Puede ajustar su volumen o silenciarse sin afectar al equipo.
3. Al llegar a **00:00**, se bloquean las tarjetas nuevas y se detiene el audio automáticamente. Los borradores se conservan. Es momento de discutir las ideas, sin límite de tiempo.
4. Quien facilita pulsa **Siguiente punto** y después **Empezar 5 minutos** para **Podemos mejorar**. Repitan para **Próximos pasos**.
5. Tras discutir el tercer punto, **Pasar a votación** abre los tres votos por persona; luego pueden acordar responsables y cerrar la retro.

Se puede **Pausar** y reanudar con el tiempo restante, pasar a discutir antes del límite o dar **Otros 5 minutos** a la misma columna. El avance entre puntos siempre es manual. El servidor controla el plazo compartido y rechaza tarjetas tardías o de otra columna. Si alguien entra tarde o reconecta, se incorpora al mismo bloque y al punto correspondiente de la pista. La música se detiene al perder la conexión y al salir del tablero. El reloj continúa si alguien se desconecta.

La fecha de vencimiento se guarda en el historial. Al recuperar una retro vencida se pasa a discusión; no se inicia otro punto automáticamente. Las retrospectivas anteriores a esta función conservan la escritura libre hasta que quien facilita inicia su primer bloque. El corte del audio se programa también en el reloj de audio del dispositivo para no depender del refresco de la pestaña.

La lista de enlaces y la identidad de cada participante se recuerdan en ese navegador. Las notas se guardan en la nube. Si cambias de navegador o borras sus datos, usa el enlace privado para volver a entrar; te reconocerá como un participante nuevo si no conservas tu identidad anterior. No existe un directorio público de retrospectivas.

La interfaz indica **Guardando historial**, **Historial guardado** o un error con reintento. Si hay un fallo de conexión con el almacenamiento, descarga las notas antes de cerrar la sesión. Capacidad: 200 tarjetas por tablero, 600 caracteres por tarjeta y hasta 30 participantes en la etapa de retro.

## Desarrollo

Node.js 20.19 o superior:

```sh
npm ci
npm run dev
```

Abre `http://localhost:3000`. Para un teléfono en la misma Wi-Fi, abre la IP local de la computadora y el puerto 3000. El enlace/QR debe generarse desde esa dirección, no desde localhost.

```sh
npm test
npm run build
npm start
```

Los tests verifican plazos de cinco minutos, pausa/reanudación, permisos del facilitador, rechazo de tarjetas tardías, recuperación de bloques guardados y los seis recorridos con dos y siete jugadores, agarre/arrastre, frenado, rescates, puntos de control, turnos, sincronización, edición concurrente, votos, permisos del tablero y una sala real con siete conexiones. Los tests de servidor usan un almacén de memoria para no crear notas de prueba en la nube. El proyecto Supabase y la aplicación publicada se comprueban además por separado.

## Publicación

GitHub Pages aloja la interfaz. Render ejecuta el servidor Node/WebSocket y también puede servir la web completa. La variable de repositorio `VITE_MULTIPLAYER_URL` apunta a `https://juntos-retro.onrender.com` y se incorpora al compilar. El workflow de Pages ejecuta tests y build.

Render usa `render.yaml`, plan Free, una única instancia, `npm ci --include=dev && npm run build` y `npm start`. Su health check es `/health`. El plan puede dormir por inactividad; abre la web antes de la reunión. Cuando actualices la lógica del servidor, despliega también la última versión en Render.

## Historial permanente y acceso

Proyecto Supabase dedicado: **Soporte Tier 3 Retro**. El esquema reproducible está en `supabase/schema.sql`. La configuración de la aplicación está en `server/storage-config.js`: contiene la URL y una **clave publicable**, no una clave privilegiada.

Cada tablero obtiene una clave aleatoria de 256 bits. En Supabase solo se guarda su hash; las políticas RLS exigen esa clave adicional en la cabecera de la petición. Sin el enlace correcto, la API no devuelve las notas. El enlace lleva la clave en el fragmento, que no se envía como parte de una petición de página. El documento persistido no incluye tokens de participantes en texto plano.

Las notas se guardan al crear el tablero y después de cada cambio, con reintentos y estado de guardado visible. Los enlaces de acceso son compartidos por el squad: quien los tenga puede leer y participar, sin crear una cuenta. Para instalar en otro proyecto aplica el esquema una vez y cambia la configuración publicable. No uses `service_role` ni claves secretas en el código del navegador.
