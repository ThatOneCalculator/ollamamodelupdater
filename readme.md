# Ollama Model Updater

The Ollama Model Updater will look at all the models you have on your system, check if there is a different version on ollama.ai, and pull the model if there is. Super simple, now with Bun.

You can compile the executable with

```sh
bun build ./update.ts --compile --minify --outfile ollamamodelupdater
```

Or grab the prebuilt binary for Linux from the [releases page](https://github.com/thatonecalculator/ollamamodelupdater-bun/releases).