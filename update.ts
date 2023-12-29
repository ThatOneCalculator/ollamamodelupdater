import { Ollama } from "ollama-node";
import { Spinner } from "@paperdave/logger";

const ollama = new Ollama();

const local_models_raw = await ollama.listModels();
const localModels = local_models_raw.complete.map((model) => ({
  name: model.name,
  digest: model.digest,
}));

const spinner = new Spinner("Grabbing latest model data");

const outdated = new Array<any>();
const checked = new Array<any>();
const failed = new Array<any>();

function bottomlog() {
  return `(${checked.length}/${localModels.length}) ${checked.join(
    ""
  )}\n${outdated.map((model) => model.name).join(" 🆙\n")}${failed.join("")}`;
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
      outdated.push(model);
    }
  } else {
    checked.push("⚠️");
    failed.push(`\n⚠️ Couldn't check ${model.name}!`);
  }
}
spinner.success(`Done!\n${checked.join("")}`);

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
