# EZiWear — server deploy (GitHub Actions → SSH → systemd)

Push to `main` → GitHub Actions SSHes into the server, runs `deploy/deploy.sh`
(git reset, `npm ci` + build backend & frontend, run migrations, restart the API).
nginx serves the Angular build and proxies `/api` to the Node service.

---

## 1. One-time server setup

```bash
# as root (or sudo)
DEPLOY_DIR=/var/www/eziwear

git clone https://github.com/Ahmed-Chouhdry/Eziwear.git "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# Node 20+ and nginx assumed already installed (they run the other apps here).
node -v   # must be >= 20
```

### 1a. Create the production `.env` (NOT in git)

```bash
cp .env.example "$DEPLOY_DIR/.env"
nano "$DEPLOY_DIR/.env"
```

Set at least:

```ini
DB_HOST=127.0.0.1          # DB is on this same box — use loopback, not the public IP
DB_PORT=3306
DB_NAME=eziwear
DB_USER=dbUser
DB_PASSWORD=<the real password>
NODE_ENV=production
PORT=5002
JWT_SECRET=<64+ random chars — `openssl rand -base64 48`>
CORS_ORIGIN=https://eziwear.example.com    # or *  (already * during setup)
CLOUDINARY_CLOUD_NAME=dcff5yfdu
CLOUDINARY_API_KEY=<...>
CLOUDINARY_API_SECRET=<...>
AUTH_RATE_LIMIT_MAX=10
```

The `eziwear` database + schema already exist (created + migrated + seeded during
initial setup). `deploy.sh` re-runs `migrate:latest` on every deploy — that's a
no-op until there are new migration files.

### 1b. systemd service

```bash
sudo cp deploy/eziwear-api.service /etc/systemd/system/eziwear-api.service
# edit WorkingDirectory / EnvironmentFile / User if your path differs from /var/www/eziwear
sudo chown -R www-data:www-data "$DEPLOY_DIR"
sudo systemctl daemon-reload

# first build so dist/ exists, then start
cd "$DEPLOY_DIR/backend" && npm ci --include=dev && npm run build
cd "$DEPLOY_DIR/frontend" && npm ci && npx ng build --configuration production

sudo systemctl enable --now eziwear-api.service
curl -fsS http://127.0.0.1:5002/api/v1/health   # {"database":"up"}
journalctl -u eziwear-api -f                     # live logs
```

### 1c. Let CI restart the service without a password

The deploy script calls `sudo systemctl restart eziwear-api.service`. Give the
CI SSH user passwordless sudo for just that:

```bash
echo '<ci-ssh-user> ALL=(root) NOPASSWD: /usr/bin/systemctl restart eziwear-api.service, /usr/bin/systemctl status eziwear-api.service' \
  | sudo tee /etc/sudoers.d/eziwear-deploy
sudo chmod 440 /etc/sudoers.d/eziwear-deploy
```

(If the CI user is already `root`, skip this.)

### 1d. nginx

```bash
sudo cp deploy/nginx-eziwear.conf /etc/nginx/sites-available/eziwear
sudo nano /etc/nginx/sites-available/eziwear      # set server_name
sudo ln -s /etc/nginx/sites-available/eziwear /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d eziwear.example.com        # TLS (optional but do it)
```

---

## 2. GitHub repo secrets

`Settings → Secrets and variables → Actions`:

| Secret | Value |
|---|---|
| `SSH_HOST` | `169.58.138.224` |
| `SSH_PORT` | `22` |
| `SSH_USER` | the deploy user (e.g. `root` or a `deploy` user) |
| `SSH_PRIVATE_KEY` | a private key whose public half is in that user's `~/.ssh/authorized_keys` |
| `DEPLOY_DIR` | `/var/www/eziwear` |

Generate a dedicated key:

```bash
ssh-keygen -t ed25519 -f eziwear_deploy -N ''
# put eziwear_deploy.pub into  <user>@169.58.138.224:~/.ssh/authorized_keys
# put the private file contents into the SSH_PRIVATE_KEY secret
```

---

## 3. Deploy

- Automatic: push to `main`.
- Manual: `Actions → Deploy to server → Run workflow`.
- On the box by hand: `cd /var/www/eziwear && git pull && bash deploy/deploy.sh`

## 4. Rollback

```bash
cd /var/www/eziwear
git reset --hard <previous-good-sha>
bash deploy/deploy.sh
```
