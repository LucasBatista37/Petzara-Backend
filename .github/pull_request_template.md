## Tipo de mudança

<!-- Marque um com [x] -->

- [ ] `feature` — nova funcionalidade (`feature/*` → `develop`)
- [ ] `bugfix` — correção não urgente (`bugfix/*` → `develop`)
- [ ] `hotfix` — correção urgente em produção (`hotfix/*` → `main` e depois portar para `develop`)
- [ ] `refactor` / `chore` / `docs` — sem mudança de comportamento da API

## Impacto

<!-- Marque todos que se aplicam -->

- [ ] Rotas / controllers
- [ ] Modelos / MongoDB / migrações implícitas
- [ ] Autenticação / JWT / cookies
- [ ] Stripe / webhooks / billing
- [ ] Socket.io / tempo real
- [ ] Jobs / cron / e-mail
- [ ] Infra / CI / variáveis de ambiente
- [ ] Nenhum impacto em produção (apenas docs, testes, tooling)

## Contexto

<!-- Link do ticket (Jira, Linear, GitHub Issue) -->

## O que mudou

<!-- 1–5 frases objetivas -->

## Como testar

1.
2.

## Risco e rollback

<!-- Risco de deploy? Rollback de imagem / release / revert do merge -->

## Dados / migração

<!-- Schema, índices novos, scripts manuais, compatibilidade com frontend em produção -->

---

## Checklist técnico obrigatório

- [ ] Lint / validação estática passou (`npm run lint:ci`)
- [ ] Testes passaram (`npm test`)
- [ ] Branch base correta (`develop` para feature/bugfix; `main` para hotfix)
- [ ] Tipo de merge adequado ao destino (squash → `develop`; merge commit ao promover `develop` → `main`)
- [ ] Código revisado (mín. 1 aprovação; 2 recomendadas em auth/Stripe/modelos)
- [ ] Sem conflitos com a branch base
- [ ] Comentários de review resolvidos (quando exigido pela proteção de branch)
