import './style.css';

type Track = {
  id: string;
  title: string;
  artist: string;
  url: string;
  file: File;
};

const audio = document.querySelector<HTMLAudioElement>('#audio')!;
const upload = document.querySelector<HTMLInputElement>('#music-upload')!;
const playButton = document.querySelector<HTMLButtonElement>('#play')!;
const previousButton = document.querySelector<HTMLButtonElement>('#previous')!;
const nextButton = document.querySelector<HTMLButtonElement>('#next')!;
const shuffleButton = document.querySelector<HTMLButtonElement>('#shuffle')!;
const repeatButton = document.querySelector<HTMLButtonElement>('#repeat')!;
const progress = document.querySelector<HTMLInputElement>('#progress')!;
const volume = document.querySelector<HTMLInputElement>('#volume')!;
const title = document.querySelector<HTMLElement>('#track-title')!;
const artist = document.querySelector<HTMLElement>('#track-artist')!;
const currentTime = document.querySelector<HTMLElement>('#current-time')!;
const duration = document.querySelector<HTMLElement>('#duration')!;
const playlist = document.querySelector<HTMLOListElement>('#playlist')!;
const emptyState = document.querySelector<HTMLElement>('#empty-state')!;
const trackCount = document.querySelector<HTMLElement>('#track-count')!;
const artwork = document.querySelector<HTMLElement>('#artwork')!;
const artworkLetter = document.querySelector<HTMLElement>('#artwork-letter')!;

let tracks: Track[] = [];
let currentIndex = -1;
let isShuffle = false;
let isRepeat = false;

audio.volume = Number(volume.value);

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function trackName(file: File): string {
  return file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
}

function loadTrack(index: number, autoplay = false): void {
  if (!tracks.length) return;
  currentIndex = (index + tracks.length) % tracks.length;
  const track = tracks[currentIndex];
  audio.src = track.url;
  title.textContent = track.title;
  artist.textContent = track.artist;
  artworkLetter.textContent = track.title.charAt(0).toUpperCase();
  artwork.style.setProperty('--hue', String((currentIndex * 63 + 265) % 360));
  renderPlaylist();
  if (autoplay) audio.play().catch(() => undefined);
}

function togglePlay(): void {
  if (!tracks.length) {
    upload.click();
    return;
  }
  if (currentIndex < 0) loadTrack(0);
  if (audio.paused) audio.play().catch(() => undefined);
  else audio.pause();
}

function nextTrack(): void {
  if (!tracks.length) return;
  if (isShuffle && tracks.length > 1) {
    let next = currentIndex;
    while (next === currentIndex) next = Math.floor(Math.random() * tracks.length);
    loadTrack(next, true);
  } else {
    loadTrack(currentIndex + 1, true);
  }
}

function previousTrack(): void {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  loadTrack(currentIndex - 1, true);
}

function renderPlaylist(): void {
  playlist.innerHTML = '';
  emptyState.hidden = tracks.length > 0;
  trackCount.textContent = `${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}`;

  tracks.forEach((track, index) => {
    const item = document.createElement('li');
    item.className = `track-item${index === currentIndex ? ' active' : ''}`;
    item.innerHTML = `
      <button class="track-select" aria-label="Play ${track.title}">
        <span class="track-number">${index === currentIndex && !audio.paused ? '♪' : index + 1}</span>
        <span class="track-meta"><strong></strong><small></small></span>
      </button>
      <button class="remove-track" aria-label="Remove ${track.title}" title="Remove">×</button>
    `;
    item.querySelector('strong')!.textContent = track.title;
    item.querySelector('small')!.textContent = track.artist;
    item.querySelector<HTMLButtonElement>('.track-select')!.addEventListener('click', () => {
      if (index === currentIndex) togglePlay();
      else loadTrack(index, true);
    });
    item.querySelector<HTMLButtonElement>('.remove-track')!.addEventListener('click', () => removeTrack(index));
    playlist.appendChild(item);
  });
}

function removeTrack(index: number): void {
  const wasCurrent = index === currentIndex;
  URL.revokeObjectURL(tracks[index].url);
  tracks.splice(index, 1);

  if (!tracks.length) {
    audio.pause();
    audio.removeAttribute('src');
    currentIndex = -1;
    title.textContent = 'Your music, your moment';
    artist.textContent = 'Add audio files to begin';
    artworkLetter.textContent = 'P';
    progress.value = '0';
    currentTime.textContent = '0:00';
    duration.textContent = '0:00';
  } else if (wasCurrent) {
    loadTrack(Math.min(index, tracks.length - 1), false);
  } else if (index < currentIndex) {
    currentIndex -= 1;
  }
  renderPlaylist();
}

upload.addEventListener('change', () => {
  const files = Array.from(upload.files ?? []).filter(file => file.type.startsWith('audio/'));
  const newTracks = files.map((file): Track => ({
    id: crypto.randomUUID(),
    title: trackName(file),
    artist: 'Local audio',
    url: URL.createObjectURL(file),
    file
  }));
  const shouldLoad = tracks.length === 0 && newTracks.length > 0;
  tracks.push(...newTracks);
  if (shouldLoad) loadTrack(0);
  else renderPlaylist();
  upload.value = '';
});

playButton.addEventListener('click', togglePlay);
nextButton.addEventListener('click', nextTrack);
previousButton.addEventListener('click', previousTrack);

shuffleButton.addEventListener('click', () => {
  isShuffle = !isShuffle;
  shuffleButton.classList.toggle('enabled', isShuffle);
  shuffleButton.setAttribute('aria-pressed', String(isShuffle));
});

repeatButton.addEventListener('click', () => {
  isRepeat = !isRepeat;
  repeatButton.classList.toggle('enabled', isRepeat);
  repeatButton.setAttribute('aria-pressed', String(isRepeat));
});

audio.addEventListener('play', () => {
  playButton.textContent = '❚❚';
  playButton.setAttribute('aria-label', 'Pause');
  renderPlaylist();
});

audio.addEventListener('pause', () => {
  playButton.textContent = '▶';
  playButton.setAttribute('aria-label', 'Play');
  renderPlaylist();
});

audio.addEventListener('loadedmetadata', () => {
  duration.textContent = formatTime(audio.duration);
});

audio.addEventListener('timeupdate', () => {
  const percent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  progress.value = String(percent);
  currentTime.textContent = formatTime(audio.currentTime);
  progress.style.setProperty('--value', `${percent}%`);
});

audio.addEventListener('ended', () => {
  if (isRepeat) {
    audio.currentTime = 0;
    audio.play().catch(() => undefined);
  } else nextTrack();
});

progress.addEventListener('input', () => {
  if (audio.duration) audio.currentTime = (Number(progress.value) / 100) * audio.duration;
});

volume.addEventListener('input', () => {
  audio.volume = Number(volume.value);
  volume.style.setProperty('--value', `${Number(volume.value) * 100}%`);
});

document.addEventListener('keydown', event => {
  if (event.code === 'Space' && document.activeElement?.tagName !== 'INPUT') {
    event.preventDefault();
    togglePlay();
  }
});

window.addEventListener('beforeunload', () => tracks.forEach(track => URL.revokeObjectURL(track.url)));
renderPlaylist();
