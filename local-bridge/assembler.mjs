import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const FFMPEG = process.env.AIVM_FFMPEG || 'ffmpeg';
const FFPROBE = process.env.AIVM_FFPROBE || 'ffprobe';
const MEDIA_ROOT = path.resolve(process.env.AIVM_MEDIA_ROOT || path.join(os.homedir(), 'aivm-media'));
const OUTPUT_ROOT = path.resolve(process.env.AIVM_OUTPUT_ROOT || path.join(MEDIA_ROOT, 'exports'));
function inside(root, candidate) { const relative = path.relative(root, path.resolve(candidate)); return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative)); }
function safeInput(value) { if (typeof value !== 'string' || !value.trim()) throw new Error('Each media input needs a file path.'); const file = path.resolve(value); if (!inside(MEDIA_ROOT, file)) throw new Error('Input file is outside the configured media root.'); return file; }
function safeOutput(name) { const clean = String(name || 'final-video.mp4').replace(/[^a-zA-Z0-9._-]/g, '-'); return clean.toLowerCase().endsWith('.mp4') ? clean : `${clean}.mp4`; }
function run(command, args) { return new Promise((resolve, reject) => { const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] }); let stderr = ''; child.stderr.on('data', chunk => { stderr += chunk.toString(); if (stderr.length > 12000) stderr = stderr.slice(-12000); }); child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error(`${command} failed (${code}): ${stderr.trim()}`))); }); }
function runCapture(command, args) { return new Promise((resolve, reject) => { const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] }); let stdout = ''; let stderr = ''; child.stdout.on('data', c => { stdout += c.toString(); if (stdout.length > 2_000_000) stdout = stdout.slice(-2_000_000); }); child.stderr.on('data', c => { stderr += c.toString(); if (stderr.length > 12_000) stderr = stderr.slice(-12_000); }); child.on('error', reject); child.on('close', code => code === 0 ? resolve(stdout) : reject(new Error(`${command} failed (${code}): ${stderr.trim()}`))); }); }
function srtTime(seconds) { const n = Math.max(0, Number(seconds) || 0), h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), s = Math.floor(n % 60), ms = Math.floor((n - Math.floor(n)) * 1000); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`; }
function subtitlePath(value) { return String(value).replaceAll('\\', '/').replaceAll(':', '\\:').replaceAll("'", "\\'"); }
function presetSize(options) { const preset = String(options.preset || '').toLowerCase(); if (preset === 'shorts' || preset === 'reels' || preset === 'tiktok' || preset === '9:16') return [1080, 1920]; if (preset === 'youtube' || preset === 'landscape' || preset === '16:9') return [1920, 1080]; if (preset === 'square' || preset === '1:1') return [1080, 1080]; return [Number(options.width || 1080), Number(options.height || 1920)]; }
async function probe(file) { const raw = await runCapture(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]); try { return JSON.parse(raw); } catch { throw new Error('ffprobe returned invalid JSON.'); } }
export async function inspectMedia(filePath) { const file = safeInput(filePath); const stat = await fs.stat(file); const data = await probe(file); const video = data.streams?.find(s => s.codec_type === 'video'); const audio = data.streams?.find(s => s.codec_type === 'audio'); const duration = Number(data.format?.duration || video?.duration || 0); return { status: 'ok', path: file, bytes: stat.size, duration, format: data.format?.format_name || null, video: video ? { codec: video.codec_name, width: Number(video.width), height: Number(video.height), fps: video.avg_frame_rate || video.r_frame_rate || null, pixelFormat: video.pix_fmt || null } : null, audio: audio ? { codec: audio.codec_name, channels: Number(audio.channels || 0), sampleRate: Number(audio.sample_rate || 0) } : null }; }
function qualityGate(media, expected) { const errors = []; if (!media?.video) errors.push('Final export has no video stream.'); if (!media?.bytes || media.bytes < 1024) errors.push('Final export is empty or suspiciously small.'); if (expected.width && media.video?.width !== expected.width) errors.push(`Expected width ${expected.width}, got ${media.video?.width}.`); if (expected.height && media.video?.height !== expected.height) errors.push(`Expected height ${expected.height}, got ${media.video?.height}.`); if (expected.audio && !media.audio) errors.push('Voice/music/SFX was requested but final export has no audio stream.'); if (expected.duration > 0 && media.duration < Math.max(0.25, expected.duration - 0.5)) errors.push('Final export duration is shorter than expected.'); return { passed: errors.length === 0, errors }; }
export async function assemble(clips, options = {}) {
  if (!Array.isArray(clips) || clips.length === 0) throw new Error('At least one video clip is required.');
  if (clips.length > 200) throw new Error('A maximum of 200 clips is supported per export.');
  const inputs = clips.map(safeInput);
  const audio = [options.voicePath, options.musicPath, ...(Array.isArray(options.sfxPaths) ? options.sfxPaths : [])].filter(Boolean).map(safeInput);
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  const jobDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aivm-assemble-'));
  try {
    let [width, height] = presetSize(options); width = Math.max(144, Math.min(3840, Math.round(width))); height = Math.max(144, Math.min(3840, Math.round(height))); const fps = Math.max(1, Math.min(60, Number(options.fps || 30)));
    const normalized = [];
    for (let i = 0; i < inputs.length; i++) { const out = path.join(jobDir, `clip-${String(i).padStart(3, '0')}.mp4`); await run(FFMPEG, ['-y', '-i', inputs[i], '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,fps=${fps},format=yuv420p`, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', out]); normalized.push(out); }
    const listFile = path.join(jobDir, 'concat.txt'); await fs.writeFile(listFile, normalized.map(file => `file '${file.replaceAll("'", "'\\''")}'`).join('\n'));
    const silentVideo = path.join(jobDir, 'video.mp4'); await run(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', silentVideo]);
    const output = path.join(OUTPUT_ROOT, safeOutput(options.outputName || `aivm-${Date.now()}.mp4`)); let videoInput = silentVideo;
    if (audio.length) {
      const audioArgs = audio.flatMap(file => ['-i', file]); const padded = audio.map((_, i) => `[${i + 1}:a]apad[a${i}]`).join(';'); const labels = audio.map((_, i) => `[a${i}]`).join('');
      const filter = `${padded};${labels}amix=inputs=${audio.length}:duration=longest:dropout_transition=2,aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11[a]`; const withAudio = path.join(jobDir, 'with-audio.mp4');
      await run(FFMPEG, ['-y', '-i', silentVideo, ...audioArgs, '-filter_complex', filter, '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', withAudio]); videoInput = withAudio;
    }
    if (Array.isArray(options.captions) && options.captions.length) { const srt = options.captions.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${String(c.text || '').replace(/\r?\n/g, ' ')}\n`).join('\n'); const srtFile = path.join(jobDir, 'captions.srt'); await fs.writeFile(srtFile, srt, 'utf8'); await run(FFMPEG, ['-y', '-i', videoInput, '-vf', `subtitles='${subtitlePath(srtFile)}'`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'copy', '-movflags', '+faststart', output]); }
    else await fs.copyFile(videoInput, output);
    const media = await inspectMedia(output); const expectedDuration = inputs.length * (Number(options.clipDuration) || 0); const qc = qualityGate(media, { width, height, audio: audio.length > 0, duration: expectedDuration });
    if (!qc.passed) throw Object.assign(new Error(`Export quality gate failed: ${qc.errors.join(' ')}`), { status: 422, qc });
    const stat = await fs.stat(output); return { status: 'completed', jobId: randomUUID(), outputPath: output, bytes: stat.size, clips: inputs.length, width, height, fps, audioTracks: audio.length, captions: Array.isArray(options.captions) ? options.captions.length : 0, media, qc };
  } finally { await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {}); }
}
