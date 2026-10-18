# Orvid secret

18+ source repository for [Orvid](https://github.com/mankidev/orvid). Its sources stay hidden until adult content is unlocked in Orvid.

To add it, open Filters → Repositories → Add repository in Orvid and paste:

```
https://raw.githubusercontent.com/mankidev/orvid-sources-secret/main/
```

The source format is described in [orvid-sources](https://github.com/mankidev/orvid-sources#source-format). `python3 tools/build.py` signs the index with the key in `ORVID_SECRET_KEY`.

## License

GPL-3.0-or-later.
