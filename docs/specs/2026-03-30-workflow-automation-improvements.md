# Workflow Automation Improvements

**Date**: 2026-03-30
**Type**: Tooling / Developer Experience

## Overview

Three automations to improve the development workflow established in CLAUDE.md, adding mechanical enforcement and convenience shortcuts.

## Improvements

### 1. Hook PreToolUse — Proteccion de master

**Objetivo**: Bloquear automaticamente ediciones de codigo fuente cuando se esta en la rama `master`. Esto es una red de seguridad real — no depende de que Claude "recuerde" la regla de CLAUDE.md.

**Implementacion**:
- Hook `PreToolUse` con matcher `Edit|Write` en `settings.local.json`
- Script `.claude/hooks/check-branch.sh` que:
  - Lee la rama actual con `git branch --show-current`
  - Si es `master`, bloquea la edicion (exit 2) con mensaje indicando crear rama primero
  - Excepciones: ficheros de configuracion (CLAUDE.md, settings, compose.yaml, docker/) que si se pueden editar en master

**Ficheros**:
- `.claude/settings.local.json` — anadir seccion hooks
- `.claude/hooks/check-branch.sh` — script de validacion

---

### 2. Hook Stop — Recordatorio de tests

**Objetivo**: Cuando Claude termina una respuesta que incluyo ediciones de codigo, sugerir ejecutar tests si no se han ejecutado en la sesion.

**Implementacion**:
- Hook `Stop` con tipo `prompt` (usa Haiku para minimizar tokens)
- El prompt evalua si hubo ediciones de codigo en la respuesta y si se ejecutaron tests
- Si detecta ediciones sin tests, sugiere lanzar el `test-writer`

**Ficheros**:
- `.claude/settings.local.json` — anadir hook Stop

---

### 3. Comando `/pr`

**Objetivo**: Automatizar la creacion de Pull Requests desde ramas feature/bugfix hacia master, generando titulo y descripcion a partir de los commits y la spec si existe.

**Implementacion**:
- Comando en `.claude/commands/pr.md`
- El comando:
  1. Verifica que no estas en master
  2. Busca spec relacionada en `docs/specs/`
  3. Genera PR con `gh pr create` incluyendo resumen de cambios y link a la spec
  4. Usa el formato estandar del proyecto (Summary + Test plan)

**Ficheros**:
- `.claude/commands/pr.md` — nuevo comando

---

### 4. Modelo Sonnet por defecto

**Objetivo**: Reducir consumo de tokens usando Sonnet como modelo base y reservando Opus para tareas que requieran razonamiento complejo (planificacion, arquitectura, specs).

**Implementacion**:
- Cambiar `"model": "opus"` a `"model": "sonnet"` en `~/.claude/settings.json`
- Opus sigue disponible via `/model opus` cuando se necesite
- Los agentes ya tienen su modelo definido individualmente (project-manager-docs usa Opus, el resto Sonnet)

**Ficheros**:
- `~/.claude/settings.json` — cambiar model

---

### 5. Usar Haiku donde sea posible

**Objetivo**: Minimizar consumo de tokens en tareas que no requieren razonamiento complejo, usando Haiku (25x mas barato que Opus).

**Implementacion**:
- Hooks de tipo `prompt`: configurar `"model": "claude-haiku-4-5-20251001"` (ej: el hook de recordatorio de tests)
- Hooks de tipo `command`: no aplica, no usan LLM (ej: el hook de proteccion de master es bash puro, coste cero)
- Agentes para tareas simples: considerar Haiku como `model` override en agentes que hagan validaciones sencillas

**Ficheros**:
- `.claude/settings.local.json` — campo `model` en hooks de tipo prompt

---

## Orden de implementacion

1. Modelo Sonnet por defecto (reduccion de coste inmediata)
2. Usar Haiku en hooks prompt (complementa #1)
3. Hook proteccion master (mayor impacto, previene errores)
4. Comando /pr (mayor conveniencia dia a dia)
5. Hook recordatorio tests (nice-to-have)
