import { Ollama } from "ollama-node";
import { Spinner } from "@paperdave/logger";
import { Command } from "commander";
import { confirm } from "@inquirer/prompts";

const program = new Command();
function commaSeparatedList(value: string, dummyPrevious) {
  return value.split(",");
}
program.option(
  "-s, --skip <models>",
  "Models to skip (seperated by commas)",
  commaSeparatedList
);
program.option(
  "-c, --confirm",
  "Enable confirmation dialog before upgrading",
  false
);
program.option("-v, --verbose", "Verbose output", false);
program.parse();

const ollama = new Ollama();
const local_models_raw = await ollama.listModels();
let localModels = local_models_raw.complete.map((model) => ({
  name: model.name,
  digest: model.digest,
}));

const options = program.opts();
const verbose = options.verbose;
const skips = options.skip;
if (skips) {
  localModels = localModels.filter(
    (model) => !skips.includes(model.name) && !skips.includes(model.digest)
  );
}

type Model = { name: string; digest: string };
type VerboseLog = {
  model: string;
  status: string;
  localDigest: string;
  remoteDigest: string;
  message?: string;
};

const outdated = new Array<Model>();
const checked = new Array<string>();
const notices = new Array<string>();
const logs = new Array<VerboseLog>();

function bottomlog() {
  return `(${checked.length}/${localModels.length}) ${checked.join(
    ""
  )}\n${notices.join("")}`;
}

async function jsonhash(json: string) {
  const jsonstring = JSON.stringify(json).replace(/\s+/g, "");
  const messageBuffer = new TextEncoder().encode(jsonstring);
  const hashBuffer = await crypto.subtle.digest("SHA-256", messageBuffer);
  const hash = Buffer.from(hashBuffer).toString("hex");
  return hash;
}

const spinner = new Spinner("Grabbing latest model data");
async function checkModel(model: Model) {
  const localdigest = model.digest;
  let [repo, tag] = model.name.split(":");

  if (!repo.includes("/")) {
    repo = `library/${repo}`;
  }

  function modelError(error) {
    checked.push("⚠️");
    notices.push(`\n⚠️ Couldn't check ${model.name} due to ${error}!`);
    if (verbose) {
      logs.push({
        model: model.name,
        status: "⚠️",
        localDigest: model.digest.substring(0, 12),
        remoteDigest: "unknown",
        message: error,
      });
    }
  }

  try {
    const remoteModelInfo = await fetch(
      `https://ollama.ai/v2/${repo}/manifests/${tag}`,
      {
        headers: {
          Accept: "application/vnd.docker.distribution.manifest.v2+json",
        },
      }
    );
    spinner.update(`Checking ${model.name}\n${bottomlog()}`);

    if (remoteModelInfo.status === 200) {
      const remoteModelInfoJSON = (await remoteModelInfo.json()) as string;
      const hash = await jsonhash(remoteModelInfoJSON);

      let status = "✅";
      const update = hash !== localdigest;
      if (update) {
        status = "🆙";
        notices.push(`\n🆙 Update available for ${model.name}!`);
        outdated.push(model);
      }
      checked.push(status);
      if (verbose) {
        logs.push({
          model: model.name,
          status: status,
          message: update ? "Update available" : "Up-to-date",
          localDigest: model.digest.substring(0, 12),
          remoteDigest: hash.substring(0, 12),
        });
      }
    } else {
      modelError(`model status: ${remoteModelInfo.status}`);
    }
  } catch (error) {
    modelError(`caught error: ${error.message}`);
  }
}

await Promise.all(localModels.map((model) => checkModel(model)));

spinner.success(`Done!\n${bottomlog()}`);

if (verbose) {
  console.table(logs);
}

if (outdated.length === 0) {
  console.log("👍 All models up-to-date!");
  process.exit(0);
}

if (options.confirm) {
  const answer = await confirm({
    message: `Update ${outdated.map((model) => model.name).join(", ")}?`,
    default: true,
  });
  if (answer == false) {
    process.exit(0);
  }
}

for await (const model of outdated) {
  console.log(`\n✨ Updating ${model.name}`);
  const proc = Bun.spawn(["ollama", "pull", model.name]);
  await proc.exited;
}
