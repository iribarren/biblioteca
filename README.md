# La Biblioteca

A solo tabletop RPG journal game where you explore your character's memories through books discovered in a mental library. Each book reveals a fragment of your past — its genre, era, binding, and scent shaping the memory you must write. Dice rolls determine whether the memory empowers or haunts you, building toward a final reckoning with your character's fate.

## Features

- **Guided game flow** — Structured progression from prologue through three chapters to a multi-stage epilogue
- **Oracle-driven book generation** — Randomized books assembled from configurable oracle tables (genre, epoch, binding, color, scent, style)
- **Ironsworn-inspired dice resolution** — Roll 1d6 + attribute vs 2d10 for hit / weak hit / miss outcomes
- **3D book animation** — Animated book reveal when a new chapter or epilogue book is generated
- **Dice roll animation** — Visual dice roll with result display
- **Journal system** — Write and save journal entries for each memory, tied to the book that triggered it
- **Export** — Print-ready formatted export of the full journal
- **Admin panel** — Password-gated CRUD interface for managing oracle tables

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend framework | Symfony | 7.2 |
| Language | PHP | 8.3 |
| Database | MySQL | 8.0 |
| ORM | Doctrine | — |
| Frontend | Vanilla JS | ES6+ |
| Styling | CSS (custom design system) | — |
| Containerization | Docker Compose | — |
| Web server | Nginx | Alpine |
| Debugging | Xdebug | — |

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Setup

```bash
# Start all services
docker compose up -d

# Run database migrations
docker compose exec backend-php php bin/console doctrine:migrations:migrate --no-interaction

# Seed oracle tables
docker compose exec backend-php php bin/console doctrine:fixtures:load --no-interaction
```

### Access

| Service | URL |
|---------|-----|
| Frontend (game) | <http://localhost:3000> |
| Backend API | <http://localhost:8080> |
| Admin panel | <http://localhost:3000/admin.html> |
| MySQL | localhost:3306 |

### Environment Variables

The following variables can be overridden via a `.env` file or shell environment:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_SECRET` | `change_me_before_production` | Symfony application secret |
| `MYSQL_PASSWORD` | `biblioteca_pass` | Database user password |
| `MYSQL_ROOT_PASSWORD` | `root_secret` | Database root password |

## Architecture

```
biblioteca/
├── backend/                  # Symfony 7.2 application
│   ├── src/
│   │   ├── Controller/       # GameController, OracleController, AdminController
│   │   ├── Entity/           # Doctrine entities (GameSession, Book, JournalEntry, etc.)
│   │   ├── Enum/             # GamePhase, AttributeType, RollOutcome
│   │   ├── Service/          # GameEngine, DiceService
│   │   ├── Oracle/           # OracleService, BookGenerator
│   │   ├── Repository/       # Doctrine repositories
│   │   └── DataFixtures/     # OracleFixtures (seed data)
│   └── Dockerfile
├── frontend/
│   └── public/
│       ├── index.html        # SPA entry point
│       ├── admin.html        # Admin panel
│       ├── js/               # api.js, app.js, state.js, book-animator.js, dice-animator.js, admin.js
│       └── css/              # theme.css, layout.css, components.css, book.css, dice.css, print.css, admin.css
├── docker/
│   ├── nginx/                # Nginx configs for backend proxy
│   └── php/conf.d/           # Xdebug config
└── compose.yaml              # Docker Compose (4 services)
```

### Key Services

- **GameEngine** — Core game logic: phase transitions, attribute checks, dice resolution, score tracking
- **DiceService** — Dice rolling (1d6, 2d10) and outcome calculation
- **OracleService** — Reads oracle tables from the database with hardcoded constant fallback
- **BookGenerator** — Assembles random books by drawing from oracle categories

## API Reference

### Game Flow

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/game` | Create a new game session |
| `GET` | `/api/game/{id}` | Get full game state |
| `GET` | `/api/games` | List all game sessions |
| `POST` | `/api/game/{id}/prologue` | Complete the prologue phase |
| `POST` | `/api/game/{id}/chapter/book` | Generate a book for the current chapter |
| `POST` | `/api/game/{id}/chapter/roll` | Roll dice for the current chapter |
| `POST` | `/api/game/{id}/epilogue/book` | Generate a book for the epilogue |
| `POST` | `/api/game/{id}/epilogue/action` | Roll an epilogue action |
| `POST` | `/api/game/{id}/epilogue/final` | Perform the final roll |

### Journal

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/game/{id}/journal` | Save a journal entry |
| `GET` | `/api/game/{id}/journal` | List journal entries for a game |
| `GET` | `/api/game/{id}/export` | Export the full journal (print-ready) |

### Oracle

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/oracle/tables` | Get all oracle tables |
| `GET` | `/api/oracle/random-setting` | Get a random genre + epoch combination |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/oracle` | List all categories with their options |
| `POST` | `/api/admin/oracle/{category}` | Add an option to a category |
| `PUT` | `/api/admin/oracle/options/{id}` | Update an option |
| `DELETE` | `/api/admin/oracle/options/{id}` | Soft-delete an option |

## Game Mechanics

The game progresses through a fixed sequence of phases:

```
Prologue → Chapter 1 → Chapter 2 → Chapter 3 → Epilogue (3 actions) → Final Roll → Completed
```

### Prologue

The player names their character and establishes the library setting (genre and epoch, either chosen or randomly generated via the oracle).

### Chapters (x3)

Each chapter follows the same loop:

1. **Generate a book** — The oracle assembles a book with randomized traits (binding, color, scent, style)
2. **Choose an attribute** — The player picks body, mind, or social (base value: 1)
3. **Roll** — 1d6 + attribute modifier vs 2d10
4. **Resolve** — The outcome determines the memory's tone and adjusts scores:

   | Outcome      | Condition              | Background | Support | Overcome |
   |--------------|------------------------|------------|---------|----------|
   | **Hit**      | d6 + attr > both d10s  | +1         | ---     | +3       |
   | **Weak hit** | d6 + attr > one d10    | ---        | +1      | +2       |
   | **Miss**     | d6 + attr <= both d10s | -1         | ---     | +1       |

5. **Write** — The player writes a journal entry describing the memory

### Epilogue

1. **Generate an epilogue book**
2. **Three actions** — Each action rolls the accumulated overcome score vs 2d10, further shaping the ending
3. **Final roll** — One last roll determines how the character's story concludes
4. **Write the final journal entry**

## Development

### Running Tests

```bash
docker compose exec backend-php php bin/phpunit
```

### Symfony Console

```bash
# List available commands
docker compose exec backend-php php bin/console

# Clear cache
docker compose exec backend-php php bin/console cache:clear

# Re-run migrations from scratch
docker compose exec backend-php php bin/console doctrine:database:drop --force
docker compose exec backend-php php bin/console doctrine:database:create
docker compose exec backend-php php bin/console doctrine:migrations:migrate --no-interaction
docker compose exec backend-php php bin/console doctrine:fixtures:load --no-interaction
```

### Xdebug

Xdebug is preconfigured for PhpStorm. The `PHP_IDE_CONFIG` environment variable is set to `serverName=biblioteca`. Ensure your PhpStorm path mappings point `backend/` to `/var/www/backend`.

### Live Editing

Frontend files in `frontend/public/` are mounted as a volume, so changes to HTML, CSS, and JS are reflected immediately without rebuilding.

## Admin Panel

Access the admin panel at **http://localhost:3000/admin.html**. It is password-gated (client-side).

From the admin panel you can:

- View all oracle categories and their options
- Add new options to any category
- Edit existing option text
- Soft-delete options (they remain in the database but are excluded from generation)

## License

TBD
