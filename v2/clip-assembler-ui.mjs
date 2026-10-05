import { assembleVideo, importVideo } from './local-provider.mjs';

const fileInput = document.getElementById('clipAssemblerFiles');
const clipList = document.getElementById('clipAssemblerList');
const status = document.getElementById('clipAssemblerStatus');
const assembleButton = document.getElementById('clipAssemblerAssemble');
const clearButton = document.getElementById('clipAssemblerClear');
const preserveAudio = document.getElementById('clipAssemblerPreserveAudio');
const finalHost = document.getElementById('clipAssemblerFinal');
const previewHost = document.getElementById('clipAssemblerPreview');

const clips = [];
let busy = false;
let previewUrl = null;

function setStatus(message) {
  status.textContent = message;
}

function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1048576).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  const value = Number(seconds) || 0;
  return `${value.toFixed(value < 10 ? 1 : 0)}s`;
}

function makeButton(label, onClick, secondary = true) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (secondary) button.className = 'secondary';
  button.disabled = busy;
  button.addEventListener('click', onClick);
  return button;
}

function showPreview(clip) {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewHost.replaceChildren();
  previewUrl = URL.createObjectURL(clip.file);
  const video = document.createElement('video');
  video.src = previewUrl;
  video.controls = true;
  video.playsInline = true;
  video.className = 'media-preview';
  previewHost.append(video);
  setStatus(`Previewing ${clip.name}.`);
}

function render() {
  clipList.replaceChildren();
  clips.forEach((clip, index) => {
    const row = document.createElement('div');
    row.className = 'asset-item';
    const title = document.createElement('strong');
    title.textContent = `${index + 1}. ${clip.name}`;
    const meta = document.createElement('p');
    const size = clip.video?.width && clip.video?.height ? `${clip.video.width}×${clip.video.height}` : 'size unknown';
    meta.textContent = `${formatDuration(clip.duration)} · ${size} · ${formatBytes(clip.file.size)} · ${clip.audio ? 'has clip audio' : 'no clip audio'}`;
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.append(
      makeButton('Preview', () => showPreview(clip)),
      makeButton('Move earlier', () => {
        if (index === 0) return;
        [clips[index - 1], clips[index]] = [clips[index], clips[index - 1]];
        finalHost.replaceChildren();
        render();
      }),
      makeButton('Move later', () => {
        if (index === clips.length - 1) return;
        [clips[index], clips[index + 1]] = [clips[index + 1], clips[index]];
        finalHost.replaceChildren();
        render();
      }),
      makeButton('Remove', () => {
        clips.splice(index, 1);
        finalHost.replaceChildren();
        render();
      })
    );
    row.append(title, meta, actions);
    clipList.append(row);
  });

  assembleButton.disabled = busy || clips.length === 0;
  clearButton.disabled = busy || clips.length === 0;
  fileInput.disabled = busy;
  preserveAudio.disabled = busy;

  if (!busy && clips.length === 0) setStatus('Choose finished video clips. No scene plan is required.');
  else if (!busy) {
    const total = clips.reduce((sum, clip) => sum + Number(clip.duration || 0), 0);
    setStatus(`${clips.length} clip${clips.length === 1 ? '' : 's'} ready · about ${formatDuration(total)} total. Arrange them, then assemble.`);
  }
}

fileInput.addEventListener('change', async () => {
  const selected = Array.from(fileInput.files || []);
  fileInput.value = '';
  if (!selected.length) return;
  busy = true;
  finalHost.replaceChildren();
  render();

  const failures = [];
  for (let index = 0; index < selected.length; index += 1) {
    const file = selected[index];
    try {
      setStatus(`Importing clip ${index + 1}/${selected.length}: ${file.name}…`);
      const result = await importVideo(file);
      clips.push({
        id: crypto.randomUUID(),
        name: file.name,
        file,
        path: result.path,
        duration: Number(result.duration),
        video: result.video,
        audio: result.audio
      });
    } catch (error) {
      failures.push(`${file.name}: ${error.message}`);
    }
  }

  busy = false;
  render();
  if (failures.length) setStatus(`${clips.length} clip${clips.length === 1 ? '' : 's'} ready. Some imports failed: ${failures.join(' | ')}`);
});

clearButton.addEventListener('click', () => {
  clips.length = 0;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  previewHost.replaceChildren();
  finalHost.replaceChildren();
  render();
});

assembleButton.addEventListener('click', async () => {
  if (!clips.length || busy) return;
  busy = true;
  finalHost.replaceChildren();
  render();
  setStatus(`Assembling ${clips.length} clip${clips.length === 1 ? '' : 's'} into one 1080×1920 MP4…`);
  let completionMessage = '';
  try {
    const durations = clips.map(clip => Number(clip.duration));
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const result = await assembleVideo(
      clips.map(clip => clip.path),
      totalDuration,
      `clip-assembler-${Date.now()}`,
      { clipDurations: durations, preserveClipAudio: preserveAudio.checked }
    );
    const link = document.createElement('a');
    link.href = result.url;
    link.download = 'aivm-v2-assembled-clips.mp4';
    link.textContent = `Download assembled MP4 (${formatBytes(result.bytes)})`;
    finalHost.append(link);
    const audioNote = preserveAudio.checked ? ' Clip audio was preserved and normalized when present.' : ' Clip audio was intentionally removed.';
    completionMessage = `Assembly passed technical checks: ${result.media.video.width}×${result.media.video.height}, ${formatDuration(result.media.duration)}.${audioNote}`;
  } catch (error) {
    completionMessage = `Assembly failed: ${error.message}`;
  } finally {
    busy = false;
    render();
    setStatus(completionMessage);
  }
});

render();
