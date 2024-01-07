import { Ollama } from "ollama-node";
import { Progress } from "@paperdave/logger";
import { Command } from "commander";
import { confirm } from "@inquirer/prompts";
import { MultiProgressBars } from "multi-progress-bars";

const program = new Command();
function commaSeparatedList(value: string, dummyPrevious) {
  return value.split(",");
}
program.option(
  "-p, --parallel",
  "Download updates in parallel",
  false
);
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
program.option("--version", "Print current version and exit");
program.parse();
const options = program.opts();

if (options.version) {
  console.log(
    "v0.8.1 of ollamamodelupdater\nhttps://github.com/ThatOneCalculator/ollamamodelupdater"
  );
  process.exit(0);
}

const ollama = new Ollama();
const local_models_raw = await ollama.listModels();
let localModels = local_models_raw.complete.map((model) => ({
  name: model.name,
  digest: model.digest,
}));

if (options.skip) {
  localModels = localModels.filter(
    (model) =>
      !options.skip.includes(model.name) && !options.skip.includes(model.digest)
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

async function jsonhash(json: string) {
  const jsonstring = JSON.stringify(json).replace(/\s+/g, "");
  const messageBuffer = new TextEncoder().encode(jsonstring);
  const hashBuffer = await crypto.subtle.digest("SHA-256", messageBuffer);
  const hash = Buffer.from(hashBuffer).toString("hex");
  return hash;
}

const progress = new Progress("Grabbing latest model data");
progress.total = localModels.length;

function updateProgress(modelname: string) {
  progress.value = checked.length;
  progress.text = `Checking ${modelname}\n${notices.join("")}`;
}

async function checkModel(model: Model) {
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
  updateProgress(model.name);

  let status = "✅";
  let message = "Up-to-date";
  let hash = "Unknown";
  if (remoteModelInfo.status === 200) {
    const remoteModelInfoJSON = (await remoteModelInfo.json()) as string;
    hash = await jsonhash(remoteModelInfoJSON);
    const update = hash !== localdigest;
    if (update) {
      status = "🆙";
      message = "Update available";
      notices.push(`\n${status} ${message} for ${model.name}!`);
      outdated.push(model);
    }
    checked.push(status);
  } else {
    status = "⚠️";
    message = `model status: ${remoteModelInfo.status}`;
    notices.push(`\n${status} Couldn't check ${model.name} due to ${message}!`);
  }
  if (options.verbose) {
    logs.push({
      model: model.name,
      status: status,
      message: message,
      localDigest: model.digest.substring(0, 12),
      remoteDigest: hash.substring(0, 12),
    });
  }
}

await Promise.all(localModels.map((model) => checkModel(model)));

if (options.verbose) {
  console.table(logs);
  console.log("\n");
}

if (outdated.length === 0) {
  progress.success("👍 All models are up-to-date!");
  process.exit(0);
} else {
  progress.success(
    `🆙 Updates available for ${outdated.map((model) => model.name).join(", ")}`
  );
}

if (options.confirm) {
  const answer = await confirm({
    message: "Update models?",
    default: true,
  });
  if (answer === false) {
    console.log("👋 Bye-bye!")
    process.exit(0);
  }
}

if (options.paralllel && outdated.length > 1) {
  const mpb = new MultiProgressBars();
  for await (const model of outdated) {
    const task = `✨ Updating ${model.name}`;
    mpb.addTask(task, { type: "percentage" });
    await ollama.streamingPull(model.name, (chunk: string) => {
      try {
        const chunkMatch = chunk.match(/\d+\.\d+/);
        if (chunk.includes("downloading") && chunkMatch) {
          const percent = parseFloat(chunkMatch[0]) / 100;
          if (percent === 1) {
            mpb.done(task, { message: `🎉 Updated ${model}!` });
          }
          mpb.updateTask(task, { percentage: percent });
        }
      } catch (error) {
        console.error(error);
      }
    });
  }
  await mpb.promise;
  console.log("\n🥳 All models updated!")
} else {
  for await (const model of outdated) {
    console.log(`\n✨ Updating ${model.name}`);
    const proc = Bun.spawn(["ollama", "pull", model.name]);
    await proc.exited;
  }
}
