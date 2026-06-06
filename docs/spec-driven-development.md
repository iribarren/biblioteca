# Especificaciones de comportamiento — La Biblioteca (Oracles API)

> **62 escenarios · 318 steps · todos en verde**
>
> Este documento describe las reglas de negocio que garantiza la suite BDD del
> backend `oracles-api`. Cada regla tiene al menos un escenario Gherkin ejecutable
> que falla si la implementación la rompe. La especificación y los tests son el
> mismo artefacto.

---

## Cómo leer este documento

Las specs están escritas en [Gherkin](https://cucumber.io/docs/gherkin/) y se
ejecutan con [Behat](https://docs.behat.org) contra la API real (sin servidor
HTTP externo). Cada sección describe **qué reglas fija** un fichero `.feature`,
por qué importan y qué casos límite cubren.

Para ejecutar la suite:

```bash
docker compose exec backend-php vendor/bin/behat          # todos los escenarios
docker compose exec backend-php vendor/bin/behat --dry-run # verifica wiring
docker compose exec backend-php vendor/bin/phpunit         # integración + unidad
```

---

## Mecánicas del juego

### Prólogo — [`prologue.feature`](../oracles-api/features/prologue.feature)

El prólogo es la fase de creación de personaje. Las specs fijan el estado inicial
del motor y el contrato de la transición de fase.

**Reglas garantizadas:**

- Un juego nuevo arranca en fase `prologue` con tres atributos (body / mind /
  social), todos con `background = 0` y `support = 0`.
- Completar el prólogo con nombre, género y época avanza la partida a `chapter_1`.
- Completar el prólogo fuera de la fase `prologue` es rechazado (guarda de fase).
- El campo `character_name` es obligatorio; omitirlo devuelve error de validación.

---

### Capítulos — [`chapters.feature`](../oracles-api/features/chapters.feature)

Los tres capítulos son el corazón de las mecánicas de dados. Las specs controlan
los dados con la cola determinista para poder afirmar efectos exactos.

**Reglas garantizadas:**

- **Efectos de la tirada** — la misma lógica en los tres resultados posibles:
  - `hit` → `attribute.background += 1`
  - `weak_hit` → `attribute.support += 1`
  - `miss` → `attribute.background -= 1`
- **Cálculo del modificador** — la acción suma `base + background + support`.
  Con background = 2 y support = 1, el modificador resultante es 4.
- **Separación resolve / advance** — resolver una tirada no avanza la fase; hace
  falta llamar a `/chapter/advance` explícitamente. Avanzar sin haber resuelto
  es rechazado.
- **Transiciones de fase** — chapter_1 → chapter_2 → chapter_3 →
  epilogue_action_1.
- **No reutilización de atributos** — cada atributo (body / mind / social) solo
  puede usarse una vez a lo largo de los tres capítulos. Reutilizarlo es
  rechazado.
- **Título de apoyo** — tras un `weak_hit`, el jugador puede asignar un título
  descriptivo al apoyo ganado (`support_title`). El título tiene un máximo de 50
  caracteres; superarlo devuelve error de validación.
- **Generación de libro** — el libro de capítulo devuelve los cuatro atributos
  visuales del tomo: `color`, `binding`, `smell`, `interior`.

---

### Epílogo — [`epilogue.feature`](../oracles-api/features/epilogue.feature)

El epílogo acumula un `overcome_score` en tres acciones y lo compara contra dos
d10 en la tirada final. Es la fase de resolución del juego.

**Reglas garantizadas:**

- **Acumulación de overcome_score** — cada acción de epílogo suma puntos según
  el resultado: hit +3, weak_hit +2, miss +1 (incluso el fallo contribuye).
- **Avance automático** — a diferencia de los capítulos, `resolveEpilogueAction`
  avanza la fase de forma atómica: epilogue_action_1 → 2 → 3 → epilogue_final.
- **Apoyo de un solo uso** — el apoyo acumulado en capítulos puede gastarse una
  vez a lo largo de las tres acciones de epílogo. El valor del atributo de apoyo
  se suma al modificador; el flag `support_used` queda marcado para siempre.
  Intentar usar el apoyo una segunda vez es rechazado.
- **No reutilización de atributos** — igual que en capítulos, cada atributo solo
  puede usarse una vez a lo largo de las tres acciones de epílogo.
- **Tirada final** — no hay dado de acción: el `action_score` es el
  `overcome_score` acumulado, comparado contra dos d10. Si supera a ambos →
  `hit`; si supera solo uno → `weak_hit`; si no supera ninguno → `miss`. La fase
  pasa a `completed`.
- **Recorrido completo** — el escenario de integración recorre prólogo → 3
  capítulos → 3 acciones de epílogo → tirada final y confirma que la partida
  llega a `completed`.

---

## Autenticación y sesiones de usuario

### Autenticación — [`authentication.feature`](../oracles-api/features/authentication.feature)

Cubre el ciclo completo de identidad del jugador: registro, login, perfil y
renovación de token.

**Reglas garantizadas:**

- **Registro exitoso** — email válido, contraseña ≥ 8 caracteres y confirmación
  coincidente devuelven `201` con un JWT listo para usar.
- **Validaciones de registro** — se rechazan: email inválido, contraseña corta,
  confirmación que no coincide. Cada caso devuelve `422`.
- **Protección anti-enumeración** — registrar un email ya existente devuelve
  `201` igual que el éxito, pero **sin token**. El sistema no revela si el email
  estaba registrado.
- **Login exitoso** — devuelve `200` con un JWT de acceso (`token`) y un token
  de refresco (`refresh_token`) para renovar la sesión sin volver a pedir
  contraseña.
- **Login fallido** — credenciales incorrectas devuelven `401`.
- **Throttling de login** — tras 5 intentos fallidos, el siguiente intento
  devuelve `401` con el mensaje `"Too many failed login attempts"`. (El handler
  JWT del bundle normaliza todos los fallos de auth a 401; el mensaje distingue
  el throttling de las credenciales incorrectas.)
- **Perfil (`/api/auth/me`)** — un token válido devuelve `200` con `id`, `email`
  y `roles`. Sin token devuelve `401`.
- **Refresco de sesión** — un `refresh_token` válido emite un nuevo JWT. Un token
  inválido devuelve `401`.

---

### Ciclo de vida y propiedad — [`game-lifecycle.feature`](../oracles-api/features/game-lifecycle.feature)

Fija el modelo de propiedad de sesiones: el juego anónimo debe permanecer
funcional, y las partidas propietarias deben ser privadas.

**Reglas garantizadas:**

- **Juego anónimo** — un invitado (sin token) puede crear una partida; la sesión
  creada no tiene dueño (`owner = null`).
- **Juego autenticado** — un jugador autenticado crea una sesión con dueño
  asignado.
- **Acceso a sesión propia** — el dueño puede acceder a su sesión (`200`).
- **Protección de sesión ajena** — otro jugador autenticado que intenta acceder a
  una sesión de la que no es dueño recibe `403`. Lo mismo aplica a un invitado
  intentando acceder a una sesión con dueño.
- **Sesiones sin dueño son públicas** — cualquier visitante, autenticado o no,
  puede ver una sesión sin propietario.
- **Listado de sesiones propias** — `GET /api/player/sessions` devuelve
  únicamente las sesiones del jugador autenticado, no las de otros. Sin token
  devuelve `401`.

> La implementación de estas reglas vive en
> [`GameSessionVoter`](../oracles-api/src/Security/GameSessionVoter.php).

---

## Datos de apoyo

### Oráculos — [`oracles.feature`](../oracles-api/features/oracles.feature)

Los oráculos son las tablas de datos públicas que alimentan la generación de
libros y la selección de ambientación.

**Reglas garantizadas:**

- **Acceso público** — los endpoints de oráculos no requieren autenticación.
- **Fallback a constantes** — cuando la base de datos de oráculos está vacía, la
  API sirve las tablas constantes embebidas en el código. Cada tabla tiene 6
  entradas con sus valores conocidos (por ejemplo, `color` incluye `"Negro"`).
- **Lectura desde BD** — cuando una categoría tiene opciones activas en base de
  datos, la API sirve esas opciones en lugar de las constantes. Un escenario
  siembra la categoría `color` con un valor distinto y verifica que la respuesta
  contiene ese valor y solo ese.
- **Setting aleatorio** — `GET /api/oracle/random-setting` devuelve un `genre` y
  un `epoch` con sus respectivos valores.

---

## Diario y exportación

### Diario — [`journal.feature`](../oracles-api/features/journal.feature)

El diario recoge las entradas narrativas del jugador. Las reglas garantizan la
integridad del contenido y la privacidad de la partida.

**Reglas garantizadas:**

- **Guardado exitoso** — una entrada con texto devuelve `201`.
- **Contenido obligatorio** — una entrada vacía devuelve `422`.
- **Saneado de HTML** — el contenido pasa por `strip_tags`; `<b>Bold</b> and
  plain` se guarda como `Bold and plain`.
- **Enlace a libro** — una entrada puede asociarse a un libro de la misma
  partida. Enlazar a un libro inexistente devuelve `404`; enlazar a un libro de
  otra partida devuelve `403`.
- **Orden cronológico** — `GET .../journal` devuelve las entradas en orden
  ascendente de creación.
- **Propiedad** — escribir en la partida de otro jugador devuelve `403`.

---

### Exportación — [`export.feature`](../oracles-api/features/export.feature)

La exportación agrega el documento imprimible completo de la partida.

**Reglas garantizadas:**

- **Estructura del documento** — la respuesta incluye las claves `title`
  (`"La Biblioteca"`), `overcome_score`, `entries` (entradas de diario
  cronológicas) y `attributes` (los tres atributos con sus valores finales).
- **Propiedad** — exportar la partida de otro jugador devuelve `403`.

---

## Infraestructura

### Health y conectividad — [`health.feature`](../oracles-api/features/health.feature)

Diagnósticos públicos usados por el frontend y por la infraestructura de
despliegue.

**Reglas garantizadas:**

- **`GET /api/health`** — devuelve `200` con `status: "healthy"` y
  `checks.database.status: "up"` cuando la base de datos es accesible.
- **`GET /api/test`** — devuelve `200` con `status: "ok"` y el mensaje de
  conectividad `"La Biblioteca API is running"`.

---

## Infraestructura de test

### Seam de aleatoriedad

El motor de dados usa `random_int`. Para poder afirmar resultados exactos
(`"un hit sube background en 1"`) los escenarios fijan las caras de los dados
antes de cada tirada:

```gherkin
Given the next action roll is a hit
When I resolve the chapter using "mind"
Then the "mind" attribute background is 1
```

Esto se implementa con una interfaz inyectable:

| Pieza | Archivo | Rol |
| --- | --- | --- |
| Interfaz | [`RandomGeneratorInterface`](../oracles-api/src/Service/Random/RandomGeneratorInterface.php) | Contrato `int(min, max)` |
| Producción | [`SystemRandomGenerator`](../oracles-api/src/Service/Random/SystemRandomGenerator.php) | `random_int` real |
| Test | [`QueuedRandomGenerator`](../oracles-api/tests/Behat/Dice/QueuedRandomGenerator.php) | Cola FIFO de caras predeterminadas |

En Behat el generador opera en modo estricto: si un escenario olvida encolar
dados, falla inmediatamente con un mensaje claro. En PHPUnit cae a `random_int`,
por lo que los tests de integración existentes no se ven afectados.

### Organización del contexto

Los steps se reparten en traits por dominio bajo
[`tests/Behat/Steps/`](../oracles-api/tests/Behat/Steps/), todos compuestos en
un único `FeatureContext`. El estado compartido fluye por `$this`:

| Trait | Dominio |
| --- | --- |
| `GameSteps` | Mecánicas de juego (dados, fases, atributos) |
| `AuthSteps` | Registro, login, perfil, refresh |
| `OwnershipSteps` | Propiedad y ciclo de vida de sesiones |
| `OracleSteps` | Tablas de oráculos (fallback + BD-first) |
| `JournalSteps` | Entradas de diario y libros |
| `ExportHealthSteps` | Exportación y diagnósticos |

Cada `@BeforeScenario` limpia la base de datos, resetea la cola de dados y borra
el estado del rate limiter de login (guardado en el pool `cache.rate_limiter`).

---

## Flujo de trabajo

Para cada nueva funcionalidad:

1. **Especificar** la regla en Gherkin (escenario nuevo o fichero `.feature`
   nuevo).
2. **Ver fallar** el escenario — la funcionalidad aún no existe.
3. **Implementar** hasta que el escenario pase.
4. **No romper** lo anterior — toda la suite (Behat + PHPUnit) debe seguir en
   verde.

Esto encaja con el *New Feature Workflow* de `CLAUDE.md`: la especificación
primero, la implementación después.

---

## Recursos

### SDD con agentes de IA

- **GitHub Spec Kit** — toolkit open source para SDD con agentes (Claude Code,
  Copilot, Gemini CLI…). Flujo `Spec → Plan → Tasks → Implement`.
  [Repositorio](https://github.com/github/spec-kit) ·
  [Anuncio en el blog de GitHub](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)
- **Amazon Kiro** — IDE agéntico centrado en SDD: de lenguaje natural a specs,
  diseño técnico y tareas.
  [kiro.dev](https://kiro.dev/) ·
  [Introducing Kiro](https://kiro.dev/blog/introducing-kiro/)
- **Anthropic — Best practices for Claude Code** — gestión de contexto,
  patrón escritor/revisor, tests como red de seguridad.
  [Guía oficial](https://www.anthropic.com/engineering/claude-code-best-practices)

### Fundamentos de BDD

- **Behat — The Gherkin Language** —
  [docs.behat.org](https://docs.behat.org/en/v3.x/user_guide/gherkin.html)
- **Cucumber — Gherkin Reference** —
  [cucumber.io](https://cucumber.io/docs/gherkin/)
- **Gojko Adzic — *Specification by Example*** — el libro de referencia.
  [O'Reilly](https://www.oreilly.com/library/view/specification-by-example/9781617290084/) ·
  [Retrospectiva 10 años después](https://gojko.net/2020/03/17/sbe-10-years.html)
