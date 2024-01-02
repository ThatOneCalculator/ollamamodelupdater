# Ollama Model Updater

The Ollama Model Updater will look at all the models you have on your system, check if there is a different version on ollama.ai, and pull the model if there is.

![Example with update and confirm](https://github.com/ThatOneCalculator/ollamamodelupdater-bun/assets/44733677/39236856-d2c0-4920-9806-d4b6383f6c00)

![CLI Demo GIF](https://github.com/ThatOneCalculator/ollamamodelupdater-bun/assets/44733677/86b5fd81-5bbc-437c-8141-cb1e94b3d701)

## CLI Options

- Skip your local models with the `-s` flag, i.e. `ollamaupdater -s linux-terminal:latest,test-modelfile:latest`
- Show a confirmation dialog before updating models with the `-c` flag.

```man
Usage: ollamamodelupdater [options]

Options:
  -s, --skip <models>  Models to skip (seperated by commas)
  -c, --confirm        Enable confirmation dialog before upgrading (default: false)
  -h, --help           display help for command
```

## Building/Installing

[![Bun Compile](https://github.com/ThatOneCalculator/ollamamodelupdater-bun/actions/workflows/main.yml/badge.svg)](https://github.com/ThatOneCalculator/ollamamodelupdater-bun/actions/workflows/main.yml) [![Release](https://github.com/ThatOneCalculator/ollamamodelupdater-bun/actions/workflows/release.yml/badge.svg)](https://github.com/ThatOneCalculator/ollamamodelupdater-bun/actions/workflows/release.yml)

You can compile and install the executable with

```sh
git clone https://github.com/ThatOneCalculator/ollamamodelupdater-bun.git
cd ollamamodelupdater-bun/
bun build ./update.ts --compile --minify --outfile ollamamodelupdater
sudo install -Dm755 ./ollamamodelupdater /usr/bin/ollamamodelupdater
```

Or get the prebuilt Linux binary from the [latest release](https://github.com/ThatOneCalculator/ollamamodelupdater-bun/releases/latest).
