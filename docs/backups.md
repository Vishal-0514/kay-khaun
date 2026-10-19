# Database backups

Every night at 03:00 (India time) GitHub copies the whole Kya Khaun database,
encrypts it and keeps it for 30 days. The workflow is
`.github/workflows/db-backup.yml`.

## One-time setup

In GitHub: **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|---|---|
| `MONGODB_URI` | The database link from MongoDB Atlas (the same one Render uses). |
| `BACKUP_PASSPHRASE` | A long password you make up. Keep it somewhere safe (a password manager). Without it, the backups can't be opened. |

Then **Actions → Database backup → Run workflow** once, to check it works.

## Getting a backup

**Actions → Database backup →** pick a night **→ Artifacts →** download
`kyakhaun-YYYY-MM-DD` (a zip with one `.archive.gz.gpg` file inside).

## Restoring

You need the MongoDB Database Tools and GnuPG on your computer.

```bash
gpg --decrypt --output kyakhaun.archive.gz kyakhaun-YYYY-MM-DD.archive.gz.gpg
mongorestore --uri="<database link>" --archive=kyakhaun.archive.gz --gzip --drop
```

`--drop` replaces what's in the database with the backup, so try it on a test
database first if you can.
