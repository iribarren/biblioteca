# La Biblioteca

A solo tabletop RPG journal game where you explore your character's memories through books discovered in a mental library. Each book reveals a fragment of your past — its genre, era, binding, and scent shaping the memory you must write. Dice rolls determine whether the memory empowers or haunts you, building toward a final reckoning with your character's fate.

## Projects

This workspace contains two independent projects:

| Project | Directory | Repository | Description |
|---------|-----------|------------|-------------|
| **The Library** | `thelibrary/` | [iribarren/thelibrary](https://github.com/iribarren/thelibrary) | Vanilla JS frontend SPA |
| **Oracles API** | `oracles-api/` | [iribarren/oracles-api](https://github.com/iribarren/oracles-api) | Symfony 7.2 REST API + EasyAdmin |

Each project has its own git repository, README, and documentation.

## Features

- **Guided game flow** — Structured progression from prologue through three chapters to a multi-stage epilogue
- **Oracle-driven book generation** — Randomized books assembled from configurable oracle tables (genre, epoch, binding, color, scent, style)
- **Ironsworn-inspired dice resolution** — Roll 1d6 + attribute vs 2d10 for hit / weak hit / miss outcomes
- **3D book animation** — Animated book reveal when a new chapter or epilogue book is generated
- **Dice roll animation** — Visual dice roll with result display
- **Journal system** — Write and save journal entries for each memory, tied to the book that triggered it
- **Export** — Print-ready formatted export of the full journal
- **Admin panel** — EasyAdmin dashboard for managing oracle tables (server-side, authenticated)

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend framework | Symfony | 7.2 |
| Language | PHP | 8.3 |
| Database | MySQL | 8.0 |
| ORM | Doctrine | 3.x |
| Admin | EasyAdmin | 4.x |
| Frontend | Vanilla JS | ES6+ |
| Styling | CSS (custom design system) | — |
| Containerization | Docker Compose | — |
| Web server | Nginx | Alpine |

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Setup

```bash
# Start all services
docker compose up -d

# Run database migrations
docker compose exec backend-php php bin/console doctrine:migrations:migrate --no-interaction

# Seed database (oracle tables + admin user)
docker compose exec backend-php php bin/console doctrine:fixtures:load --no-interaction
```

### Access

| Service | URL |
|---------|-----|
| Frontend (game) | <http://localhost:3000> |
| Backend API | <http://localhost:8080/api> |
| Admin panel | <http://localhost:8080/admin> |
| MySQL | localhost:3306 |

### Default Admin Credentials

| Field | Value |
|-------|-------|
| Email | `admin@biblioteca.local` |
| Password | `admin123` |

### Environment Variables

The following variables can be overridden via a `.env` file or shell environment:

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_SECRET` | `change_me_before_production` | Symfony application secret |
| `MYSQL_PASSWORD` | `biblioteca_pass` | Database user password |
| `MYSQL_ROOT_PASSWORD` | `root_secret` | Database root password |

## Architecture

```
biblioteca/                       # Workspace root
├── oracles-api/                  # Symfony 7.2 backend (own git repo)
│   ├── src/
│   │   ├── Controller/           # API controllers + EasyAdmin CRUD
│   │   ├── Entity/               # Doctrine entities
│   │   ├── Enum/                 # GamePhase, AttributeType, RollOutcome
│   │   ├── Service/              # GameEngine, DiceService
│   │   ├── Oracle/               # OracleService, BookGenerator
│   │   └── DataFixtures/         # OracleFixtures, AdminUserFixtures
│   ├── Dockerfile
│   └── Dockerfile.prod
├── thelibrary/                   # Vanilla JS frontend (own git repo)
│   └── public/
│       ├── index.html            # SPA entry point
│       ├── js/                   # app.js, api.js, state.js, animators
│       └── css/                  # theme, layout, components, animations
├── docker/
│   ├── nginx/                    # Nginx configs (dev + prod)
│   └── php/conf.d/               # Xdebug config
├── compose.yaml                  # Docker Compose (4 services)
└── compose.prod.yaml             # Production overrides
```

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
docker compose exec backend-php php bin/console cache:clear
```

### Xdebug

Xdebug is preconfigured for PhpStorm. The `PHP_IDE_CONFIG` environment variable is set to `serverName=biblioteca`. Ensure your PhpStorm path mappings point `oracles-api/` to `/var/www/backend`.

### Live Editing

Frontend files in `thelibrary/public/` are mounted as a volume, so changes to HTML, CSS, and JS are reflected immediately without rebuilding.

## License

TBD
