import { Ollama } from "ollama-node";
import { Spinner } from "@paperdave/logger";
import { Command } from "commander";

const ollama = new Ollama();
const program = new Command();

function commaSeparatedList(value, dummyPrevious) {
  return value.split(",");
}

program.option(
  "-s, --skip <models>",
  "Models to skip (seperated by commas)",
  commaSeparatedList
);

program.parse();

const local_models_raw = await ollama.listModels();
let localModels = local_models_raw.complete.map((model) => ({
  name: model.name,
  digest: model.digest,
}));

const options = program.opts();
const skips = options.skip;
if (skips) {
  localModels = localModels.filter(
    (model) => !skips.includes(model.name) && !skips.includes(model.digest)
  );
}

const spinner = new Spinner("Grabbing latest model data");

const outdated = new Array<any>();
const checked = new Array<any>();
const notices = new Array<any>();

function bottomlog() {
  return `(${checked.length}/${localModels.length}) ${checked.join(
    ""
  )}\n${notices.join("")}`;
}

for await (const model of localModels) {
  spinner.update(`Checking ${model.name}\n${bottomlog()}`);
  const localdigest = model.digest;
  let [repo, tag] = model.name.split(":");

  if (!repo.includes("/")) {
    repo = `library/${repo}`;
  }

  const remoteModelInfo = await fetch(
    `https://ollama.ai/v2/${repo}/manifests/${tag}`,
    {
      headers: {
        Accept: "application/vnd.docker.distribution.manifest.v2+json",
      },
    }
  );

  if (remoteModelInfo.status == 200) {
    const remoteModelInfoJSON = await remoteModelInfo.json();

    const hash = await jsonhash(remoteModelInfoJSON);
    if (hash === localdigest) {
      checked.push("✅");
    } else {
      checked.push("🆙");
      notices.push(`\n🆙 Update available for ${model.name}!`);
      outdated.push(model);
    }
  } else {
    checked.push("⚠️");
    notices.push(`\n⚠️ Couldn't check ${model.name}!`);
  }
}
spinner.success(`Done!\n${bottomlog()}`);

for await (const model of outdated) {
  console.log(`\n✨ Updating ${model.name}`);
  const proc = Bun.spawn(["ollama", "pull", model.name]);
  await proc.exited;
}

async function jsonhash(json: string) {
  const jsonstring = JSON.stringify(json).replace(/\s+/g, "");
  const messageBuffer = new TextEncoder().encode(jsonstring);
  const hashBuffer = await crypto.subtle.digest("SHA-256", messageBuffer);
  const hash = Buffer(hashBuffer).toString("hex");

  return hash;
}
