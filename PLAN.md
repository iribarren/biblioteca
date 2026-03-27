# Plan de Desarrollo - La Biblioteca (TTRPG Journal Game)

## Contexto

"La Biblioteca" es un juego de rol en solitario tipo diario/journal donde el jugador explora la memoria de su personaje a traves de libros en una biblioteca mental. El proyecto ya tiene una base en PHP 8 + Nginx + Docker con funciones de dados y tablas oraculo en `app/biblioteca.php`. Se necesita convertir esto en una aplicacion web completa con frontend interactivo, animaciones de libros, y persistencia de partidas.

---

## Fase 0: Decisiones Tecnologicas

**Agente: `general-purpose`** (investigacion) + usuario (decisiones)

### Stack propuesto

| Capa | Tecnologia | Justificacion |
|------|-----------|---------------|
| Backend | **Symfony 7** (PHP 8.3) | Framework robusto, escalable, preparado para crecer |
| Base de datos | **MySQL 8** | Robusta, preparada para futuras necesidades de datos |
| ORM | **Doctrine** (incluido en Symfony) | Mapeo entidades, migraciones, repositorios |
| Frontend | Vanilla JS (ES modules) + CSS animations | Animaciones de libro, sin build step, ligero |
| Fuentes | Cinzel (titulos) + Lora (cuerpo/diario) | Estetica medieval/biblioteca |
| Contenedores | Docker: 3 servicios (backend, frontend, mysql) | Servicios independientes y desacoplados |
| Tests | PHPUnit + Symfony test bundle | Standard Symfony |
| API | Symfony controllers + JSON responses | API REST para consumir desde cualquier frontend |

### Decisiones clave
- **Symfony**: Framework maduro, inyeccion de dependencias, Doctrine ORM, sistema de migraciones, validacion, seguridad integrada. Preparado para crecer mas alla del juego actual
- **MySQL**: Base de datos relacional robusta para persistencia a largo plazo. Permite consultas complejas si se anaden features sociales, rankings, etc.
- **Frontend y backend separados**: Dos servicios Docker independientes. El backend expone una API REST pura (JSON). El frontend es un servidor Nginx estatico. Esto permite:
  - Desarrollo y despliegue independiente de cada servicio
  - Anadir otros clientes en el futuro (app movil, CLI) consumiendo la misma API
  - Escalar cada servicio por separado
- **Vanilla JS en frontend**: Las animaciones del libro se hacen mejor con CSS `@keyframes` + JS para orquestar. No necesitamos React/Vue por ahora
- **CORS**: El backend debera configurar cabeceras CORS para permitir peticiones del frontend

---

## Fase 1: Infraestructura y Entorno de Desarrollo

**Agente: `devops-env-security`**

### Arquitectura de servicios Docker

```
docker-compose.yaml
├── backend (PHP-FPM + Symfony)     -> puerto 8080
│   ├── Nginx (proxy al PHP-FPM)
│   └── PHP-FPM (Symfony app)
├── frontend (Nginx statico)        -> puerto 3000
│   └── Nginx (sirve HTML/CSS/JS)
└── mysql (MySQL 8)                 -> puerto 3306
```

### Estructura de directorios

```
biblioteca/
├── backend/                    # Proyecto Symfony
│   ├── config/                 # Configuracion Symfony (routes, services, packages)
│   ├── src/
│   │   ├── Controller/         # API Controllers
│   │   ├── Entity/             # Entidades Doctrine
│   │   ├── Repository/         # Repositorios Doctrine
│   │   ├── Service/            # Logica de negocio (GameEngine, DiceService...)
│   │   └── Oracle/             # Tablas y generador oraculo
│   ├── migrations/             # Migraciones Doctrine
│   ├── tests/                  # PHPUnit tests
│   ├── public/index.php        # Front controller Symfony
│   ├── composer.json
│   ├── .env                    # Config Symfony (DATABASE_URL, etc.)
│   └── Dockerfile              # PHP-FPM + Composer + extensiones
├── frontend/
│   ├── public/                 # Web root
│   │   ├── index.html
│   │   ├── css/
│   │   ├── js/
│   │   └── assets/
│   ├── Dockerfile              # Nginx para servir estaticos
│   └── nginx.conf              # Config Nginx frontend
├── docker/
│   ├── nginx/
│   │   └── backend.conf        # Config Nginx para el backend API
│   └── mysql/
│       └── init.sql            # Script inicializacion (opcional)
├── compose.yaml                # Orquestacion de los 3 servicios
├── .env                        # Variables de entorno Docker (puertos, passwords)
└── README.md
```

### Tareas

1. **Crear proyecto Symfony en `backend/`:**
   - `symfony new backend --webapp` o equivalente con Composer
   - Asegurar que incluye: doctrine, maker-bundle, validator, serializer
   - Instalar `nelmio/cors-bundle` para CORS

2. **Crear `backend/Dockerfile`:**
   - Base: `php:8.3-fpm`
   - Extensiones: `pdo_mysql`, `intl`, `xdebug` (dev)
   - Instalar Composer y ejecutar `composer install`

3. **Crear `docker/nginx/backend.conf`:**
   - Proxy reverso al PHP-FPM de Symfony
   - Front controller: todo redirige a `public/index.php`

4. **Crear `frontend/Dockerfile`:**
   - Base: `nginx:alpine`
   - Copia `frontend/public/` al root de Nginx
   - Config para SPA (fallback a index.html)

5. **Crear `frontend/nginx.conf`:**
   - Servir archivos estaticos
   - Fallback a `index.html` para rutas SPA

6. **Actualizar `compose.yaml` con 3 servicios:**
   - `backend`: PHP-FPM + Nginx, puerto 8080, depende de mysql
   - `frontend`: Nginx estatico, puerto 3000
   - `mysql`: MySQL 8, puerto 3306, volumen persistente, password via .env

7. **Configurar CORS en Symfony:**
   - `nelmio/cors-bundle` permitiendo origen del frontend (http://localhost:3000)

8. **Configurar Doctrine:**
   - `DATABASE_URL` en `.env` apuntando al servicio mysql
   - Verificar conexion desde el container backend

9. **Crear `frontend/public/index.html`** basico con fetch a la API para verificar conexion

10. **Actualizar `.gitignore`:** vendor/, var/, node_modules/, .env.local

11. **Seguridad base (parte del MVP):**
    - Configurar Symfony security component (firewall basico para la API)
    - Input validation y sanitization via Symfony Validator en todas las entidades
    - Proteccion XSS: escapar contenido del diario en la salida JSON (htmlspecialchars o Symfony serializer)
    - Rate limiting en endpoints de la API (Symfony RateLimiter component)
    - Headers de seguridad en Nginx: X-Content-Type-Options, X-Frame-Options, Content-Security-Policy
    - MySQL: usuario con permisos minimos (no root para la app), password seguro via .env
    - CORS estricto: solo permitir el origen del frontend, no wildcard

12. **Verificar** que `docker compose up` levanta los 3 servicios:
    - http://localhost:3000 -> frontend (HTML estatico)
    - http://localhost:8080/api/test -> backend (JSON response)
    - MySQL accesible desde backend

### Ficheros a crear/modificar
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `docker/nginx/backend.conf`
- `compose.yaml` (reescribir)
- `.env` (variables Docker)
- `backend/.env` (Symfony config)
- `frontend/public/index.html`
- `.gitignore`

---

## Fase 2: Modelo de Dominio y Logica del Juego

**Agente: `backend-api-engineer`**

### 2.1 Entidades Doctrine

**IMPORTANTE: Todo el codigo (clases, propiedades, metodos, columnas DB, tablas) debe estar en ingles.**

| Entity | Key fields | Relations |
|--------|-----------|-----------|
| `GameSession` | id (UUID), character_name, character_description, genre, epoch, current_phase (enum: prologue/chapter_1/chapter_2/chapter_3/epilogue_action_1/epilogue_action_2/epilogue_action_3/epilogue_final/completed), created_at | OneToMany -> Attribute, Book, JournalEntry, RollResult |
| `Attribute` | id, type (enum: body/mind/social), base_value (1), background (int), background_title, support (int), support_title | ManyToOne -> GameSession |
| `Book` | id, phase, color, color_hint, binding, binding_hint, smell, smell_hint, interior | ManyToOne -> GameSession, OneToMany -> JournalEntry |
| `JournalEntry` | id, phase, content (text), created_at | ManyToOne -> GameSession, ManyToOne -> Book (nullable) |
| `RollResult` | id, phase, action_number, action_die (d6 result), challenge_die_1 (d10 result), challenge_die_2 (d10 result), modifier, action_score (PA), outcome (enum: hit/weak_hit/miss) | ManyToOne -> GameSession |

**Glosario de traducciones del juego:**
- Fisico -> `body`, Mental -> `mind`, Social -> `social`
- Trasfondo -> `background`, Apoyo -> `support`
- Dado de accion (1d6) -> `action_die` (one six-sided die)
- Dados de desafio (2d10) -> `challenge_die_1`, `challenge_die_2` (two ten-sided dice)
- Puntuacion de accion (PA) -> `action_score`
- Puntuacion de superacion (PS) -> `overcome_score`
- Exito total -> `hit`, Exito parcial -> `weak_hit`, Fracaso -> `miss`

Usar `make:entity` de Symfony para generar entidades y repositorios.
Crear migracion con `doctrine:migrations:diff`.

### 2.2 Migrar logica existente de `app/biblioteca.php`

Servicios Symfony (inyectables via autowiring):

- `App\Oracle\OracleService` - oracle function + all tables as class constants (MVP). In Phase 9 these move to DB
- `App\Oracle\BookGenerator` - generates a complete Book from oracle tables (depends on OracleService)
- `App\Service\DiceService` - rollDie(), rollAction() (game system: 1d6 + attribute vs 2d10). 1d6 = one six-sided die, 2d10 = two ten-sided dice rolled independently
- `App\Service\GameEngine` - game engine: manages phases, rules, transitions (depends on DiceService, BookGenerator, Doctrine repositories)

### 2.3 Base de datos

- Doctrine ORM gestiona la conexion via `DATABASE_URL` en `.env`
- Migraciones generadas con `doctrine:migrations:diff` y ejecutadas con `doctrine:migrations:migrate`
- Repositorios Doctrine para queries personalizadas

### GameEngine Rules

**Prologue:**
- Select genre + epoch (manual or random)
- Create character with 3 attributes (body, mind, social) base_value = 1
- Save journal entry

**Chapters (x3):**
- Generate random book
- Player chooses attribute (cannot reuse across chapters)
- Roll: action_score = 1d6 (one six-sided die) + attribute_value
  - Hit (action_score >= challenge_die_1 AND action_score >= challenge_die_2): background +1
  - Weak hit (action_score >= one of the challenge dice): support +1
  - Miss (action_score < both challenge dice): background -1
- Save journal entry (linked to the Book)

**Epilogue:**
- Generate random book
- 3 sequential actions (each attribute once, order chosen by player)
- Modifiers: all background modifiers apply, only ONE support can be used
- Overcome score (OS) per action: hit=3, weak_hit=2, miss=1
- Final roll: only 2d10 (two ten-sided dice), OS must beat both challenge dice
- Save final journal entry (linked to the Book)

### Ficheros a crear
- `backend/src/Entity/GameSession.php`
- `backend/src/Entity/Attribute.php`
- `backend/src/Entity/Book.php`
- `backend/src/Entity/JournalEntry.php`
- `backend/src/Entity/RollResult.php`
- `backend/src/Repository/` (generados por make:entity)
- `backend/src/Oracle/OracleService.php`
- `backend/src/Oracle/BookGenerator.php`
- `backend/src/Service/DiceService.php`
- `backend/src/Service/GameEngine.php`
- `backend/migrations/` (generadas por Doctrine)

---

## Fase 3: API REST

**Agente: `backend-api-engineer`**

### Endpoints

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/game` | Crear nueva partida |
| GET | `/api/game/{id}` | Estado completo de la partida |
| POST | `/api/game/{id}/prologue` | Enviar prologo (nombre, descripcion, ambientacion, diario) |
| GET | `/api/game/{id}/book` | Obtener libro actual generado |
| POST | `/api/game/{id}/chapter/{n}` | Resolver capitulo N (atributo elegido + tirada) |
| POST | `/api/game/{id}/chapter/{n}/journal` | Guardar entrada diario del capitulo |
| POST | `/api/game/{id}/epilogue/action/{n}` | Resolver accion N del epilogo |
| POST | `/api/game/{id}/epilogue/final` | Tirada final del epilogo |
| POST | `/api/game/{id}/journal` | Guardar entrada de diario (generico) |
| GET | `/api/game/{id}/journal` | Obtener todas las entradas del diario |

### CORS
- Configurado via `nelmio/cors-bundle` en Fase 1
- Permite origen `http://localhost:3000` (frontend)

### Serialization
- Symfony Serializer with serialization groups to control exposed fields
- Group `game:read` for GET, `game:write` for POST

### Security (integrated in MVP)
- Input validation on all POST endpoints via Symfony Validator (Assert annotations on entities)
- Sanitize journal content (strip HTML tags, prevent XSS)
- Rate limiting on roll endpoints (prevent brute-force rerolling)
- UUID for game session IDs (not auto-increment, prevents enumeration)

### Ficheros a crear
- `backend/src/Controller/GameController.php`
- `backend/src/Controller/JournalController.php` (opcional, separar responsabilidades)

---

## Fase 4: Tests del Backend

**Agente: `test-writer`**

### Tests unitarios
- `DiceServiceTest` - distribucion de dados, clasificacion de resultados
- `OracleServiceTest` - tablas devuelven valores validos
- `GameEngineTest` - transiciones de fase, reglas de atributos, calculos de trasfondo/apoyo/PS, tirada final
- `BookGeneratorTest` - genera libros con propiedades validas

### Tests de integracion
- `GameControllerTest` - flujo completo de una partida via API (con MySQL de test o SQLite en memoria via config Symfony test env)

### Ficheros a crear
- `backend/tests/Unit/DiceServiceTest.php`
- `backend/tests/Unit/OracleServiceTest.php`
- `backend/tests/Unit/GameEngineTest.php`
- `backend/tests/Integration/GameControllerTest.php`

---

## Fase 5: Frontend - Estructura y Estetica

**Agente: `gameui-frontend-dev`**

### 5.1 HTML y tema visual

- Estetica de biblioteca medieval: tonos marrones calidos, papel envejecido, acentos dorados
- Layout: barra lateral (estado del juego + atributos) + area principal (fase actual) + panel de diario
- Fuentes: Cinzel (titulos), Lora (cuerpo)
- Componentes CSS: botones estilizados, cards de libros, textarea del diario con aspecto pergamino, display de dados

### 5.2 Flujo del juego en JS

- `frontend/public/js/api.js` - cliente API (fetch a http://localhost:8080/api/...)
- `frontend/public/js/state.js` - estado local del juego
- `frontend/public/js/app.js` - controlador principal, renderizado de fases

Pantallas:
1. **Inicio** - Titulo, boton "Nueva Partida"
2. **Prologo** - Selector genero/epoca, formulario personaje, textarea diario
3. **Capitulo** - Presentacion libro, seleccion atributo, boton tirada, resultado, textarea diario
4. **Epilogo** - Libro final, acciones secuenciales, PS acumulados, tirada final, textarea diario
5. **Resumen** - Diario completo, opcion exportar

### Ficheros a crear
- `frontend/public/index.html`
- `frontend/public/css/theme.css`, `layout.css`, `components.css`, `animations.css`, `book.css`
- `frontend/public/js/api.js`, `state.js`, `app.js`

---

## Fase 6: Animacion del Libro

**Agente: `gameui-frontend-dev`**

Esta es la feature visual estrella del juego.

### Secuencia de animacion
1. Estanteria de lomos de libros renderizada en CSS (fondo estatico)
2. Un libro se desliza fuera de la estanteria (`transform: translateX + translateZ` para profundidad 3D)
3. El libro rota mostrando la portada (color + encuadernacion visibles)
4. El libro se abre revelando el estilo interior
5. Propiedades no visuales (olor) aparecen como texto flotante con fade-in
6. Descripcion completa en texto debajo de la animacion

### Implementacion
- Componente CSS/SVG del libro estilizable dinamicamente segun propiedades
- Color -> `background-color` + gradientes
- Encuadernacion -> texturas CSS (grano de cuero, hueso, madera, terciopelo, carton, piel)
- Interior -> marco decorativo al abrir
- Controlador JS de la maquina de estados de animacion

### Ficheros a crear
- `frontend/public/js/book-animator.js`
- `frontend/public/css/book.css`
- `frontend/public/css/animations.css`
- Assets SVG en `frontend/public/assets/`

---

## Fase 7: Visualizacion de Dados y Polish

**Agente: `gameui-frontend-dev`**

- Animacion de tirada de d6 y 2d10 (spinner de numeros o dados CSS)
- Desglose visual: d6 + atributo = PA vs cada d10
- Codigo de color: verde (exito), amarillo (parcial), rojo (fracaso)
- Transiciones suaves entre resultado y actualizacion de atributos

---

## Fase 8: Exportacion y Persistencia

**Agente: `backend-api-engineer`**

- `GET /api/game/{id}/export` - diario formateado como documento
- Exportar via `window.print()` con CSS de impresion
- Pantalla de lista de partidas: continuar partida inacabada o revisar completada

---

## Fase 9: Tablas del Oraculo en BBDD + Panel de Administracion

**Agente: `backend-api-engineer`** (backend) + `gameui-frontend-dev`** (panel admin)

En el MVP las tablas del oraculo (color, binding, smell, interior, genre, epoch) son constantes en `OracleService`. En esta fase se migran a la base de datos para que sean editables.

### 9.1 Modelo de datos

Nuevas entidades Doctrine:

| Entity | Key fields |
|--------|-----------|
| `BookPropertyCategory` | id, name (enum: color/binding/smell/interior), display_order |
| `BookPropertyOption` | id, category (ManyToOne -> BookPropertyCategory), value (string), hint (string), display_order, is_active (bool) |
| `SettingCategory` | id, name (enum: genre/epoch), display_order |
| `SettingOption` | id, category (ManyToOne -> SettingCategory), value (string), display_order, is_active (bool) |

### 9.2 Migracion de datos

- Crear migracion Doctrine que cree las tablas
- Crear DataFixtures que carguen los valores actuales de las constantes de `OracleService` como datos iniciales
- Modificar `OracleService` para que lea de la BBDD en vez de constantes (inyectar repositorios)
- Mantener las constantes como fallback o eliminarlas tras verificar la migracion

### 9.3 API de administracion

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/book-properties` | List all categories and their options |
| POST | `/api/admin/book-properties/{category}` | Add new option to a category |
| PUT | `/api/admin/book-properties/options/{id}` | Update an option (value, hint, active) |
| DELETE | `/api/admin/book-properties/options/{id}` | Soft delete (set is_active=false) |
| GET | `/api/admin/settings` | List all setting categories (genre, epoch) |
| POST | `/api/admin/settings/{category}` | Add new setting option |
| PUT | `/api/admin/settings/options/{id}` | Update a setting option |
| DELETE | `/api/admin/settings/options/{id}` | Soft delete |

### 9.4 Panel de administracion (frontend)

- Pagina sencilla accesible en `/admin` del frontend
- Vista de tablas editables por categoria (color, binding, smell, interior, genre, epoch)
- CRUD basico: anadir, editar, desactivar opciones
- Preview del hint/descripcion asociada a cada valor
- Protegido con autenticacion basica o password simple

### Ficheros a crear
- `backend/src/Entity/BookPropertyCategory.php`
- `backend/src/Entity/BookPropertyOption.php`
- `backend/src/Entity/SettingCategory.php`
- `backend/src/Entity/SettingOption.php`
- `backend/src/Controller/AdminController.php`
- `frontend/public/admin.html`
- `frontend/public/js/admin.js`
- `frontend/public/css/admin.css`

---

## Fase 10: Documentacion

**Agente: `project-manager-docs`**

- Actualizar `README.md` con descripcion, setup, arquitectura
- PHPDoc en clases y metodos
- JSDoc en modulos JavaScript

---

## Fase 11: Produccion (stretch)

**Agente: `devops-env-security`**

- `compose.prod.yaml` override sin XDebug, PHP optimizado, Nginx con cache headers
- Health check endpoint (`/api/health`)
- Variables de entorno de produccion (APP_ENV=prod, secrets gestionados)

---

## Orden de Ejecucion y Dependencias

```
Fase 0 (decisiones) -----> Fase 1 (infra + seguridad base)
                              |
                    +---------+---------+
                    |                   |
                Fase 2 (dominio)    Fase 5.1 (HTML/CSS)
                    |                   |
                Fase 3 (API)        Fase 5.2 (JS)
                    |                   |
                Fase 4 (tests)      Fase 6 (animacion libro)
                    |                   |
                    +---------+---------+
                              |
                    Fase 7 (dados + polish)
                              |
              +-------+-------+-------+-------+
              |       |       |       |       |
           Fase 8  Fase 9  Fase 10 Fase 11  Sonido
          (export) (admin) (docs) (prod)   (stretch)
```

**MVP jugable**: Fases 1-4 + 5.1 + 5.2 (backend + tests + seguridad + frontend funcional)
  - Tablas del oraculo como constantes en OracleService
**Version completa**: + Fases 6, 7, 8
**Administrable**: + Fase 9 (tablas en BBDD + panel admin)
**Polish final**: + Fases 10, 11, sonido

---

## Verificacion

Para verificar que todo funciona end-to-end:
1. `docker compose up` -> 3 servicios levantados
2. http://localhost:3000 -> frontend cargado
3. http://localhost:8080/api/test -> backend responde JSON
4. Crear nueva partida via UI -> se persiste en MySQL
5. Completar prologo (elegir ambientacion, escribir diario)
6. Jugar 3 capitulos (ver animacion libro, elegir atributo, tirar dados, escribir diario)
7. Jugar epilogo (3 acciones + tirada final + diario)
8. Ver resumen con todas las entradas del diario
9. Exportar diario
10. Recargar pagina -> la partida se recupera de la API
