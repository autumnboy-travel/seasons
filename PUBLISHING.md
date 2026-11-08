# Publishing guide (for the maintainer)

A one-time setup, then every release is just a git tag.

## 1. Accounts (one time)

1. Create the dev email (for example `autumnboy.dev@proton.me`) and turn on 2FA for it.
2. Create an npm account at npmjs.com with that email. Turn on 2FA with a passkey.
3. Your npm username `autumnboy-studio` is your scope, so no organization is needed.
4. Save the 2FA recovery codes in your password manager.

## 2. GitHub repo (one time)

Using the **autumnboy-travel** GitHub account:

1. Create a new public repo named **`seasons`** (no README, it's already here).
2. Set your commit email to the GitHub noreply address of that account
   (GitHub → Settings → Emails → "Keep my email addresses private" shows it), then:

```bash
cd seasons
git init -b main
git config user.name "autumnboy.travel"
git config user.email "<id>+autumnboy-travel@users.noreply.github.com"
git add .
git commit -m "feat: autumn leaves 🍂 v0.1.0"
git remote add origin https://github.com/autumnboy-travel/seasons.git
git push -u origin main
```

3. Repo → Settings → Pages → Source: **GitHub Actions**. The demo goes live at
   https://autumnboy-travel.github.io/seasons/
4. Repo → Settings → Security → enable **Private vulnerability reporting**.
5. Repo → Settings → Branches → protect `main` (require the CI check to pass).
6. Add a description and topics: `autumn`, `animation`, `canvas`, `npm-package`.

## 3. First publish (from your computer, once)

npm can only set up trusted publishing for a package that already exists, so
version 0.1.0 is published by hand:

```bash
npm login            # opens the browser, passkey 2FA
npm run check        # build + tests + list of files that will be published
npm publish --access public
```

Check https://www.npmjs.com/package/@autumnboy-studio/seasons

## 4. Turn on trusted publishing (right after the first publish)

1. npmjs.com → your package → **Settings → Trusted Publisher → GitHub Actions**.
2. Organization or user: `autumnboy-travel` · Repository: `seasons` ·
   Workflow filename: `release.yml` · Environment: `npm`.
3. On GitHub: Settings → Environments → create an environment named **`npm`**
   (optionally require your approval before each release).
4. On npmjs.com package settings, set publishing access to
   **"Require two-factor authentication and disallow tokens"**.

Add the trusted publisher only when you plan to tag a release soon: npm expects
the first trusted publish within about two days, otherwise you need to set it up again.

## 5. Every future release

```bash
# 1. Update CHANGELOG.md
# 2. Bump the version in package.json AND src/core.js (the build checks they match)
npm version patch --no-git-tag-version   # or minor / major
git commit -am "release: v0.1.1"
git tag v0.1.1
git push && git push --tags
```

GitHub Actions builds, tests and publishes with a provenance badge. No npm token is stored anywhere.

## Versioning

- `0.1.x` patch: bug fixes
- `0.x.0` minor: new features (for example `winter`)
- `1.0.0`: when the API feels final
