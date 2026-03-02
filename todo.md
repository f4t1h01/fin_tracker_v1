# Fin Tracker Deployment TODO

## Fast-forward intake (fill this first)

Use this section to collect everything needed so I can execute as much as possible quickly.

### Required inputs from you
- [x] `VPS_HOST=`
- [x] `VPS_USER=fatih` (change if different)
- [x] `VPS_PATH=/home/fatih/telegram_bots/fin_tracker` (change if different)
- [x] `NEXT_PUBLIC_API_URL=`
- [x] `NEXT_PUBLIC_TELEGRAM_BOT_NAME=`
- [x] `API_BASE_URL=`
- [x] `WEB_APP_URL=`
- [x] `CORS_ORIGIN=`
- [ ] `DATABASE_URL=`
- [x] `API_PORT=4000` (change if different)
- [ ] `API_JWT_SECRET=`
- [ ] `TELEGRAM_BOT_TOKEN=`
- [ ] `BOT_SHARED_SECRET=`
- [x] `GHCR_USERNAME=f4t1h01` (change if different)
- [x] `GHCR_PAT=`
- [ ] `REPO_TOKEN=`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

### Captured information (auto-filled)
- `VPS_HOST=100.65.0.134`
- `VPS_USER=fatih`
- `VPS_PATH=/home/fatih/telegram_bots/fin_tracker`
- `API_PORT=4000`
- `NEXT_PUBLIC_TELEGRAM_BOT_NAME=coup_fin_trackerbot`
- `Local .env present`: `C:\Users\Asus\projects\telegram_bots\fin_tracker\.env`
- `GH auth`: logged in as `f4t1h01`
- `GitHub variables already exist`:
  - `NEXT_PUBLIC_API_URL=https://cupfin.shaxin.uz/api`
  - `NEXT_PUBLIC_TELEGRAM_BOT_NAME=coup_fin_trackerbot`
- `GitHub secrets exist`: `VPS_HOST`, `VPS_USER`, `VPS_PATH`, `VPS_SSH_KEY`, `GHCR_USERNAME`, `GHCR_PAT`

### Proposed production values (from latest Cloudflare info)
- `WEB_DOMAIN=https://cupfin.shaxin.uz`
- `CORS_ORIGIN=https://cupfin.shaxin.uz`
- `NEXT_PUBLIC_API_URL=https://cupfin.shaxin.uz/api`
- `API_BASE_URL=http://api:4000` (internal Docker service-to-service)
- `WEB_APP_URL=https://cupfin.shaxin.uz/profile`

### Infra prerequisites to make above values work
- Ensure server terminates HTTPS on `:443` and routes:
  - `cupfin.shaxin.uz` -> web container `:3000`
  - `cupfin.shaxin.uz/api` -> api container `:4000`

### Sensitive values policy
- Do not paste raw secret values into this file.
- Store only masked hints, e.g. `GHCR_PAT=ghp_***`, `TELEGRAM_BOT_TOKEN=***`.
- Rotate any token that was ever committed to git history.
- Saved hint only: `GHCR_PAT=ghp_***` (raw value intentionally not stored)
- Saved hint only: `Git clone auth token used on VPS=***` (raw value intentionally not stored)

### Access and execution confirmation
- [x] I am logged in to GitHub CLI on this machine (`gh auth status` OK)
- [x] This machine has access to private key file at `$HOME/.ssh/id_ed25519`
- [x] VPS is reachable by SSH from this machine
- [x] I want assistant to run `gh` commands directly on this machine when possible
- [x] I will paste command outputs after each manual-only step

### Ownership map (who does what)
- [ ] USER: Provide real secret values and domain names
- [ ] USER: Confirm/rotate production credentials if needed
- [ ] USER: Run `nano` edits on VPS for `.env` (or paste values so I can generate exact file content)
- [ ] USER: Any step requiring interactive login prompts not available to assistant
- [ ] ASSISTANT: Prepare exact commands for each stage
- [ ] ASSISTANT: Run non-interactive local commands (`gh`, `git`) if your environment allows
- [ ] ASSISTANT: Validate progress and keep this checklist updated

This checklist tracks your progress through the deployment runbook in `starter.md`.

## Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done

## Current stage
- **Now:** Stage 5 - Watch workflow runs
- **Sub-stage now:** Re-run CI/Deploy after applying failure fixes

---

## Stage 1 - Configure GitHub vars/secrets

### 1.1 Repository and auth setup
- [x] Set `REPO` variable in PowerShell (`f4t1h01/fin_tracker_v1`)  
  _Why:_ All `gh` commands need target repo.
- [x] Run `gh auth status` and confirm logged in  
  _Why:_ Secret/variable commands fail if GitHub CLI is not authenticated.

### 1.2 Build-time GitHub Variables
- [x] Set `NEXT_PUBLIC_API_URL` with `gh variable set`  
  _Why:_ Injects frontend API URL at build time.
- [x] Set `NEXT_PUBLIC_TELEGRAM_BOT_NAME` with `gh variable set`  
  _Why:_ Frontend needs the bot username at build time.

### 1.3 Deploy GitHub Secrets (CURRENT)
- [x] Set `VPS_HOST`  
  _Why:_ Workflow must know where to SSH.
- [x] Set `VPS_USER`  
  _Why:_ Workflow needs server user for SSH login.
- [x] Set `VPS_PATH`  
  _Why:_ Workflow needs deploy directory on VPS.
- [x] Set `VPS_SSH_KEY` (private key content)  
  _Why:_ Enables non-interactive secure SSH from Actions.
- [x] Set `GHCR_USERNAME`  
  _Why:_ Needed to authenticate Docker registry operations.
- [x] Set `GHCR_PAT`  
  _Why:_ Needed to pull/push images from/to GHCR.

### 1.4 Validate stage 1
- [x] Confirm all variable names exist in GitHub repo settings  
  _Why:_ Prevents workflow failures from missing keys.
- [x] Confirm all secret names exist in GitHub repo settings  
  _Why:_ Deploy workflow depends on exact names.

---

## Stage 2 - Prepare VPS path + Docker + repo
- [x] SSH into VPS (`ssh fatih@YOUR_VPS_IP_OR_DOMAIN`)  
  _Why:_ One-time server bootstrap.
- [x] Install required packages (`git`, `docker.io`, `docker-compose-plugin`)  
  _Why:_ Required to run and update containers.
- _Status:_ `git` and Docker are already installed; `docker.io` install failed due to conflict with existing `containerd.io` from Docker repo. No action needed if Docker works.
- [x] Add user to docker group (`usermod -aG docker fatih`)  
  _Why:_ Run Docker without `sudo`.
- _Status:_ user `fatih` already in `docker` group.
- [x] Re-load group (`newgrp docker`)  
  _Why:_ Apply docker group membership immediately.
- _Status:_ not needed if you re-login via SSH (already done).
- [x] Ensure parent directory exists (`~/telegram_bots`)  
  _Why:_ Standard deploy location.
- _Status:_ exists.
- [x] Clone repo if missing (`~/telegram_bots/fin_tracker`)  
  _Why:_ Server must have project code.
- _Status:_ directory exists but is empty; clone still required.
- [x] Pull latest `main`  
  _Why:_ Keep server code synced with GitHub.
- [x] Verify `docker --version` and `docker compose version`  
  _Why:_ Confirms runtime is ready.

---

## Stage 3 - Create server .env
- [x] Create/edit `/home/fatih/telegram_bots/fin_tracker/.env`  
  _Why:_ Runtime configuration for API/web/bot.
- _Status:_ file exists on VPS, but several values are still placeholders and must be replaced.
- [x] Fill placeholders safely:
  - [x] `DATABASE_URL`
  - [x] `API_PORT`
  - [x] `API_JWT_SECRET`
  - [x] `TELEGRAM_BOT_TOKEN`
  - [x] `BOT_SHARED_SECRET`
  - [x] `CORS_ORIGIN`
  - [x] `NEXT_PUBLIC_API_URL`
  - [x] `NEXT_PUBLIC_TELEGRAM_BOT_NAME`
  - [x] `API_BASE_URL`
  - [x] `WEB_APP_URL`
  _Why:_ Missing/incorrect values will break deploy or runtime behavior.
  _Status:_ all required keys are present and `DATABASE_URL` typo was fixed.

---

## Stage 4 - Push CI/CD changes
- [ ] Stage files (`.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `Dockerfile`, `README.md`)  
  _Why:_ These are the deployment pipeline updates.
- [ ] Commit with message: `chore: harden CI/CD and production deploy pipeline`  
  _Why:_ Creates auditable change history.
- [ ] Push to `origin main`  
  _Why:_ Triggers CI and deploy workflows.

---

## Stage 5 - Watch workflow runs
- [x] Run `gh run list -R f4t1h01/fin_tracker_v1 --limit 10`  
  _Why:_ Confirm workflows started.
- [x] Run `gh run watch -R f4t1h01/fin_tracker_v1`  
  _Why:_ Track live progress and failures.
- [~] Confirm both CI and Deploy succeed  
  _Why:_ Ensures build quality and server rollout.
  _Status:_ latest runs failed. Fixes prepared locally: removed hardcoded pnpm version in CI and updated Dockerfile to build shared workspace packages before app build. Need new push to verify.

---

## Stage 6 - Verify services on VPS
- [ ] SSH to server and open project path  
  _Why:_ Post-deploy checks.
- [ ] Check containers: `docker compose -f ops/docker-compose.server.yml ps`  
  _Why:_ Confirm services are up.
- [ ] Check API logs: `docker compose -f ops/docker-compose.server.yml logs --tail=100 api`  
  _Why:_ Detect startup/runtime errors.
- [ ] Health check: `curl http://localhost:4000/health`  
  _Why:_ Confirms API responds as expected (`{"ok":true}`).

---

## Final readiness check
- [ ] Deploy workflow includes `prisma migrate deploy` and it succeeded  
  _Why:_ Database schema must match app version.
- [ ] GitHub Actions token has package write access  
  _Why:_ Required for GHCR push/pull operations.
- [ ] All domains in `.env` point to real production URLs  
  _Why:_ Avoid broken API/web integrations.
