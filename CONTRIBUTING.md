# Contribuindo — Petzara Backend

Política normativa (GitFlow, merge, PR, CI, review): [docs/engineering-workflow.md](docs/engineering-workflow.md).

## Branches

- `main` — produção; merges apenas via Pull Request.
- `develop` — integração.
- `feature/<ticket>-descricao`, `bugfix/<ticket>-descricao`, `hotfix/<ticket>-descricao`.

## Fluxo

1. Branch a partir de `develop` (ou `main` para hotfix).
2. PR com template; CI deve passar (`npm test`, health com env de CI).
3. **Squash merge** ao integrar `feature/*` ou `bugfix/*` em `develop`; **merge commit** ao promover `develop` → `main`; hotfix conforme [engineering-workflow.md](docs/engineering-workflow.md).

## Segurança

Não commite `.env`, chaves Stripe ou JWT. Use secrets do provedor ou GitHub Actions.

## GitHub (mantenedor)

Proteger `main`/`develop`: PR obrigatório, checks obrigatórios, sem force push.

## Observabilidade e escala

- `SENTRY_TRACES_SAMPLE_RATE` — opcional; padrão 0.1 em produção.
- Plano Redis / multi-instância: ver o workspace `docs/REDIS_E_SCALING.md` na pasta PetCare (copiar para `docs/` deste repo se desejar).
