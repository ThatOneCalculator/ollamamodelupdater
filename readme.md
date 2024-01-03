# Ollama Model Updater 🦙

The Ollama Model Updater will look at all the models you have on your system, check if there is a different version on https://ollama.ai, and pull the model if there is.

*Yes, this is real-time*
![CLI Demo GIF](https://github.com/ThatOneCalculator/ollamamodelupdater/assets/44733677/aaa42a3a-81f3-4716-a825-060bddbaac40)

## CLI Options

- Download models in parallel with the `-p`/`--parallel` flag, i.e. `ollamamodelupdater -p 3`
- Skip your local models with the `-s`/`--skip` flag, i.e. `ollamaupdater -s linux-terminal:latest,test-modelfile:latest`
- Show a confirmation dialog before updating models with the `-c`/`--confirm` flag.
- Show a verbose table of all models, statuses, and local/remote hashes with the `-v`/`--verbose` flag

```
Usage: ollamamodelupdater [options]

Options:
  -p, --parallel <number>  Number of model updates to download in parallel (default: "1")
  -s, --skip <models>      Models to skip (seperated by commas)
  -c, --confirm            Enable confirmation dialog before upgrading (default: false)
  -v, --verbose            Verbose output (default: false)
  --version                Print current version and exit
  -h, --help               display help for command
```

## Building/Installing

### AUR

```sh
yay -S ollamamodelupdater # or ollamamodelupdater-bin
```

### From source

[![Bun Compile](https://github.com/ThatOneCalculator/ollamamodelupdater-bun/actions/workflows/main.yml/badge.svg)](https://github.com/ThatOneCalculator/ollamamodelupdater-bun/actions/workflows/main.yml)

*Requires bun >= 1.0.21*

You can compile and install the executable with

```sh
git clone https://github.com/ThatOneCalculator/ollamamodelupdater.git
cd ollamamodelupdater/
bun build ./update.ts --compile --minify --outfile ollamamodelupdater
sudo install -Dm755 ./ollamamodelupdater /usr/bin/ollamamodelupdater
```

### Prebuilt binary

[![Release](https://github.com/ThatOneCalculator/ollamamodelupdater-bun/actions/workflows/release.yml/badge.svg)](https://github.com/ThatOneCalculator/ollamamodelupdater-bun/actions/workflows/release.yml)

You can also get the prebuilt Linux binary from the [latest release](https://github.com/ThatOneCalculator/ollamamodelupdater-bun/releases/latest).

```sh
curl -OL https://github.com/thatonecalculator/ollamamodelupdater/releases/download/v0.8.1/ollamamodelupdater
sudo install -Dm755 ./ollamamodelupdater /usr/bin/ollamamodelupdater
```
