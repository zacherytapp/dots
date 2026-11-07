// The parts of the dictation step that decide what to do. Docker has no GPU,
// so the CUDA branch is covered here with fake venvs and caches.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, test } from "node:test";
import {
  CPU_MODEL,
  GPU_MODEL,
  backendReady,
  defaultModel,
  inspectVenv,
  mergeConfig,
  modelCached,
  requiredFixes,
} from "./dictation.ts";

const root = mkdtempSync(join(tmpdir(), "dictation-test-"));
after(() => rmSync(root, { recursive: true, force: true }));
let n = 0;
const fresh = () => join(root, String(n++));

function touch(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "");
}

/** A venv like hyprwhspr's: bin/python linked to a real file, faster-whisper, maybe the CUDA wheels. */
function venv(opts: { cuda: boolean; python?: boolean }): string {
  const dir = fresh();
  const site = join(dir, "lib", "python3.14", "site-packages");
  touch(join(site, "faster_whisper", "__init__.py"));
  if (opts.cuda) {
    touch(join(site, "nvidia", "cublas", "lib", "libcublas.so.12"));
    touch(join(site, "nvidia", "cudnn", "lib", "libcudnn.so.9"));
  }
  mkdirSync(join(dir, "bin"), { recursive: true });
  const target = join(dir, "system-python");
  if (opts.python !== false) touch(target);
  symlinkSync(target, join(dir, "bin", "python"));
  return dir;
}

describe("model", () => {
  test("turbo on nvidia, small on cpu", () => {
    assert.equal(defaultModel(true), GPU_MODEL);
    assert.equal(defaultModel(false), CPU_MODEL);
  });
});

describe("mergeConfig", () => {
  const working = {
    $schema: "x",
    recording_mode: "push_to_talk",
    push_to_talk_lock_seconds: 0,
    external_bindings: true,
    language: "en",
    whisper_prompt: "p",
    transcription_backend: "faster-whisper",
    faster_whisper_model: "large-v3-turbo",
    faster_whisper_device: "auto",
  };

  test("a working config is left alone", () => {
    assert.deepEqual(mergeConfig(working, CPU_MODEL).changes, []);
  });

  test("keys hyprwhspr dropped as defaults count as set", () => {
    // its sparse save removes push_to_talk_lock_seconds: 0 and device "auto"
    const { push_to_talk_lock_seconds: _a, faster_whisper_device: _b, ...sparse } = working;
    assert.deepEqual(mergeConfig(sparse, CPU_MODEL).changes, []);
  });

  test("a new config gets the schema, required keys and model for the hardware", () => {
    const gpu = mergeConfig({}, defaultModel(true)).config;
    assert.equal(gpu.$schema?.toString().endsWith("config.schema.json"), true);
    assert.equal(gpu.recording_mode, "push_to_talk");
    assert.equal(gpu.external_bindings, true);
    assert.equal(gpu.transcription_backend, "faster-whisper");
    assert.equal(gpu.faster_whisper_model, GPU_MODEL);
    assert.equal(gpu.language, "en");
    // hyprwhspr's default already; not written
    assert.equal("faster_whisper_device" in gpu, false);
    assert.equal(mergeConfig({}, defaultModel(false)).config.faster_whisper_model, CPU_MODEL);
  });

  test("device cuda becomes auto, cpu is kept", () => {
    const cuda = mergeConfig({ ...working, faster_whisper_device: "cuda" }, GPU_MODEL);
    assert.deepEqual(cuda.changes, ["faster_whisper_device"]);
    assert.equal(cuda.config.faster_whisper_device, "auto");
    assert.deepEqual(
      mergeConfig({ ...working, faster_whisper_device: "cpu" }, GPU_MODEL).changes,
      [],
    );
  });

  test("required keys are reset, the user's other choices kept", () => {
    const edited = {
      ...working,
      push_to_talk_lock_seconds: 2,
      transcription_backend: "rest-api",
      faster_whisper_model: "medium",
      language: "de",
      audio_ducking: false,
    };
    const { config, changes } = mergeConfig(edited, GPU_MODEL);
    assert.deepEqual(changes.sort(), ["push_to_talk_lock_seconds", "transcription_backend"]);
    assert.equal(config.faster_whisper_model, "medium");
    assert.equal(config.language, "de");
    assert.equal(config.audio_ducking, false);
  });

  test("requiredFixes reports what verify fails on", () => {
    assert.deepEqual(requiredFixes(working), {});
    assert.deepEqual(requiredFixes({}), {
      recording_mode: "push_to_talk",
      external_bindings: true,
      transcription_backend: "faster-whisper",
    });
  });
});

describe("backend", () => {
  test("a cpu venv is ready without a working nvidia driver, not with one", () => {
    const cpu = inspectVenv(venv({ cuda: false }));
    assert.deepEqual(cpu, { fasterWhisper: true, cudaLibs: false });
    assert.equal(backendReady(cpu, false), true);
    assert.equal(backendReady(cpu, true), false);
  });

  test("a cuda venv is ready either way", () => {
    const gpu = inspectVenv(venv({ cuda: true }));
    assert.equal(backendReady(gpu, true), true);
    assert.equal(backendReady(gpu, false), true);
  });

  test("a missing venv or a broken python link needs a reinstall", () => {
    assert.equal(backendReady(inspectVenv(fresh()), false), false);
    assert.equal(backendReady(inspectVenv(venv({ cuda: true, python: false })), false), false);
  });
});

describe("modelCached", () => {
  const hub = fresh();
  const turbo = "mobiuslabsgmbh/faster-whisper-large-v3-turbo";
  touch(join(hub, `models--${turbo.replace("/", "--")}`, "snapshots", "a", "model.bin"));
  mkdirSync(join(hub, "models--Systran--faster-whisper-small", "snapshots", "partial"), {
    recursive: true,
  });

  test("a complete snapshot", () => assert.equal(modelCached(hub, turbo), true));
  test("an interrupted download is not cached", () =>
    assert.equal(modelCached(hub, "Systran/faster-whisper-small"), false));
  test("another org's repo is not this one", () =>
    assert.equal(modelCached(hub, "other/faster-whisper-large-v3-turbo"), false));
  test("a local model directory", () => {
    const local = fresh();
    touch(join(local, "model.bin"));
    assert.equal(modelCached(hub, local), true);
    assert.equal(modelCached(hub, fresh()), false);
  });
  test("a missing cache", () => assert.equal(modelCached(fresh(), turbo), false));
});
