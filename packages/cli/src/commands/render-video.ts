/**
 * `plain deck render-video <file.md>` — Marp deck → mp4 with narration + BGM.
 *
 * Flow:
 *   1. Parse Marp .md via marpToDeck → DeckDoc
 *   2. Extract a SlideSpec per slide (title / bullets[:5] / notes)
 *   3. Write a temp props.json that the Remotion DeckVideo composition consumes
 *   4. (unless --no-tts) shell out to `edge-tts` per slide for zh-CN narration
 *   5. ffmpeg concat → narration.wav
 *   6. (unless --no-bgm) reuse apps/videos/out/bgm.wav if present
 *   7. remotion render → tmpvideo.mp4 with --duration-in-frames computed
 *   8. ffmpeg amix narration + bgm onto tmpvideo → final out.mp4
 *
 * Notes:
 *   - We do NOT add new npm deps. edge-tts / ffmpeg / remotion are shelled out.
 *   - If edge-tts isn't installed, we warn and skip narration (--no-tts behavior).
 *   - durationInFrames is passed via `--duration-in-frames` flag so the same
 *     composition handles any deck length without dynamic calculateMetadata.
 */
import { Command } from "commander";
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from "node:fs";
import { join, resolve, basename, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { progress, fail } from "../output";

// V36 · ESM 没有 __dirname,用 import.meta.url 还原(tsx/Node ESM 下必需)
const __dirname = dirname(fileURLToPath(import.meta.url));
// V36 fix · @/core 在 CLI(tsx/Node ESM)是循环依赖强连通分量,顶层静态 import 会在
// linking 期拿到未初始化 binding。改 action 回调内动态 import(运行时环已就绪)。
// 详见 run-agent.ts 注释。web 端走 webpack 不受影响。

// Mirror of SlideSpec in apps/videos/src/DeckVideo/styles.ts. We don't import
// it (the videos app isn't on the CLI's path), but the shape must match.
type SlideSpec = {
  title: string;
  bullets?: string[];
  notes?: string;
  layout?: string;
};

const FPS = 30;
const PER_SLIDE_FRAMES = 150;

/** repo root, relative to cli/src/commands/render-video.ts */
const REPO_ROOT = resolve(__dirname, "..", "..", "..");

function which(cmd: string): boolean {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [cmd], {
    encoding: "utf8",
  });
  return r.status === 0 && !!r.stdout.trim();
}

function runOrFail(cmd: string, args: string[], label: string): void {
  progress(`${label}: ${cmd} ${args.slice(0, 3).join(" ")}${args.length > 3 ? " …" : ""}`);
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0) {
    fail(`${label} failed (exit ${r.status})`);
  }
}

function buildNarrationText(s: SlideSpec): string {
  // Prefer speaker notes ("演讲备注"); fallback to title + bullets concatenated.
  if (s.notes && s.notes.trim()) return s.notes.trim();
  const parts = [s.title, ...(s.bullets ?? [])].filter(Boolean);
  return parts.join("。");
}

export function registerRenderVideo(deck: Command): void {
  deck
    .command("render-video")
    .description("Render a Marp deck (.md) into an mp4 with TTS narration + BGM")
    .argument("<file>", "deck source file (.md)")
    .option("-o, --output <file>", "output mp4 path (default: <input>.mp4)")
    .option("--no-tts", "skip edge-tts narration")
    .option("--no-bgm", "skip background music mix")
    .action(async (file: string, opts: { output?: string; tts: boolean; bgm: boolean }) => {
      // V36 fix · 动态 import 打破 CLI ESM 循环依赖(见文件头注释)
      const { marpToDeck } = await import("@/core");
      // ---------- step 1+2: parse Marp → DeckDoc → SlideSpec[] ----------
      const source = readFileSync(file, "utf8");
      const deckDoc = marpToDeck(source);

      const slides: SlideSpec[] = deckDoc.slides.map((s) => ({
        title: s.title,
        bullets: (s.bullets ?? []).slice(0, 5),
        notes: s.notes,
        layout: s.layout,
      }));

      if (slides.length === 0) fail("deck has no slides");
      progress(`parsed ${slides.length} slide(s) from ${file}`);

      const durationInFrames = slides.length * PER_SLIDE_FRAMES;
      const outFile = opts.output ?? `${basename(file, extname(file))}.mp4`;

      // ---------- step 3: temp dir + props.json ----------
      const work = mkdtempSync(join(tmpdir(), "plain-deck-video-"));
      const propsPath = join(work, "props.json");
      writeFileSync(propsPath, JSON.stringify({ slides }));

      // ---------- step 4: edge-tts per slide ----------
      const voicePaths: string[] = [];
      let ttsOk = false;
      if (opts.tts) {
        if (!which("edge-tts")) {
          process.stderr.write(
            "! edge-tts not found on PATH — skipping narration (install: pipx install edge-tts)\n",
          );
        } else {
          ttsOk = true;
          for (let i = 0; i < slides.length; i++) {
            const txt = buildNarrationText(slides[i]);
            const mp3 = join(work, `voice-${i}.mp3`);
            runOrFail(
              "edge-tts",
              [
                "--voice", "zh-CN-XiaoxiaoNeural",
                "--text", txt,
                "--write-media", mp3,
              ],
              `tts slide ${i + 1}/${slides.length}`,
            );
            voicePaths.push(mp3);
          }
        }
      }

      // ---------- step 5: ffmpeg concat → narration.wav ----------
      let narrationPath: string | null = null;
      if (ttsOk && voicePaths.length > 0) {
        if (!which("ffmpeg")) {
          process.stderr.write("! ffmpeg not found — skipping narration mux\n");
        } else {
          const listFile = join(work, "voices.txt");
          writeFileSync(
            listFile,
            voicePaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"),
          );
          narrationPath = join(work, "narration.wav");
          runOrFail(
            "ffmpeg",
            [
              "-y",
              "-f", "concat",
              "-safe", "0",
              "-i", listFile,
              "-ar", "44100",
              narrationPath,
            ],
            "ffmpeg concat narration",
          );
        }
      }

      // ---------- step 6: BGM (reuse apps/videos/out/bgm.wav) ----------
      const bgmCandidate = join(REPO_ROOT, "apps", "videos", "out", "bgm.wav");
      const bgmPath = opts.bgm && existsSync(bgmCandidate) ? bgmCandidate : null;
      if (opts.bgm && !bgmPath) {
        process.stderr.write(`! no BGM at ${bgmCandidate} — skipping music bed\n`);
      }

      // ---------- step 7: remotion render → tmpvideo.mp4 ----------
      const tmpVideo = join(work, "deck-silent.mp4");
      const remotionEntry = join(REPO_ROOT, "apps", "videos", "src", "index.ts");
      runOrFail(
        "npx",
        [
          "remotion", "render",
          remotionEntry,
          "DeckVideo",
          tmpVideo,
          `--props=${propsPath}`,
          "--codec=h264",
          `--duration-in-frames=${durationInFrames}`,
        ],
        "remotion render",
      );

      // ---------- step 8: ffmpeg mux ----------
      if (!narrationPath && !bgmPath) {
        // Nothing to mix — just rename.
        writeFileSync(outFile, readFileSync(tmpVideo));
        process.stderr.write(`✓ wrote ${outFile} (no audio)\n`);
        return;
      }

      const muxArgs: string[] = ["-y", "-i", tmpVideo];
      const filterInputs: string[] = [];
      let next = 1;
      if (narrationPath) {
        muxArgs.push("-i", narrationPath);
        filterInputs.push(`[${next}]volume=1[a${next}]`);
        next++;
      }
      if (bgmPath) {
        muxArgs.push("-i", bgmPath);
        filterInputs.push(`[${next}]volume=0.15[a${next}]`);
        next++;
      }
      const tracks = [];
      if (narrationPath) tracks.push("[a1]");
      if (bgmPath) tracks.push(narrationPath ? "[a2]" : "[a1]");
      const filter =
        filterInputs.join(";") +
        (tracks.length > 1
          ? `;${tracks.join("")}amix=inputs=${tracks.length}:duration=longest[aout]`
          : `;${tracks[0]}anull[aout]`);

      muxArgs.push(
        "-filter_complex", filter,
        "-map", "0:v",
        "-map", "[aout]",
        "-c:v", "copy",
        "-shortest",
        outFile,
      );
      runOrFail("ffmpeg", muxArgs, "ffmpeg mux");

      process.stderr.write(`✓ wrote ${outFile}\n`);
    });
}
