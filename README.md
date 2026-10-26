# Soporte Tier 3 · Retro

[Entrar al juego](https://alex-carrera.github.io/juntos-retro/) · [Repositorio](https://github.com/alex-carrera/juntos-retro) · [Servidor](https://juntos-retro.onrender.com)

Seis retos cooperativos para 2–7 personas, seguidos por un tablero de retrospectiva compartido. Android, iPhone y computadora desde el navegador. Sin cuentas de jugadores ni rankings.

## De la aventura a la retro

1. Crea una sala, comparte su enlace o QR y espera al equipo.
2. Todos marcan «Estoy listo» y quien facilita inicia.
3. Completen seis retos con cuerdas, caídas, agarres, cintas y ráfagas.
4. Cuando todos llegan a la última salida, el tablero de retro se abre automáticamente para todo el equipo.
5. Escriban ideas, voten y acuerden acciones. La retro queda guardada en Supabase.

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
- Historial guardado y reapertura desde «Mis retrospectivas guardadas».
- El enlace privado del tablero permite que el squad vuelva a leer y participar. Guárdenlo en un lugar compartido de confianza.

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

Los tests verifican los seis recorridos con dos y siete jugadores, agarre/arrastre, frenado, rescates, puntos de control, turnos, sincronización, edición concurrente, votos, permisos del tablero y una sala real con siete conexiones. Los tests de servidor usan un almacén de memoria para no crear notas de prueba en la nube. El proyecto Supabase y la aplicación publicada se comprueban además por separado.

## Publicación

GitHub Pages aloja la interfaz. Render ejecuta el servidor Node/WebSocket y también puede servir la web completa. La variable de repositorio `VITE_MULTIPLAYER_URL` apunta a `https://juntos-retro.onrender.com` y se incorpora al compilar. El workflow de Pages ejecuta tests y build.

Render usa `render.yaml`, plan Free, una única instancia, `npm ci --include=dev && npm run build` y `npm start`. Su health check es `/health`. El plan puede dormir por inactividad; abre la web antes de la reunión. Cuando actualices la lógica del servidor, despliega también la última versión en Render.

## Historial permanente y acceso

Proyecto Supabase dedicado: **Soporte Tier 3 Retro**. El esquema reproducible está en `supabase/schema.sql`. La configuración de la aplicación está en `server/storage-config.js`: contiene la URL y una **clave publicable**, no una clave privilegiada.

Cada tablero obtiene una clave aleatoria de 256 bits. En Supabase solo se guarda su hash; las políticas RLS exigen esa clave adicional en la cabecera de la petición. Sin el enlace correcto, la API no devuelve las notas. El enlace lleva la clave en el fragmento, que no se envía como parte de una petición de página. El documento persistido no incluye tokens de participantes en texto plano.

Las notas se guardan al crear el tablero y después de cada cambio, con reintentos y estado de guardado visible. Los enlaces de acceso son compartidos por el squad: quien los tenga puede leer y participar, sin crear una cuenta. Para instalar en otro proyecto aplica el esquema una vez y cambia la configuración publicable. No uses `service_role` ni claves secretas en el código del navegador.
