import { Ollama } from "ollama-node";

const ollama = new Ollama();

const local_models_raw = await ollama.listModels();
const localModels = local_models_raw.complete.map((model) => ({
  name: model.name,
  digest: model.digest,
}));
const outdated = new Array<any>();

for await (const model of localModels) {
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
      console.log(`You have the latest ${model.name}`);
    } else {
      console.log(`You have an outdated version of ${model.name}`);
      outdated.push(model);
    }
  }
}

for await (const model of outdated) {
  console.log(`Updating ${model.name}`);
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
