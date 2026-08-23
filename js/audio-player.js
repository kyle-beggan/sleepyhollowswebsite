/* Sleepy Hollows Custom Audio Player Script */

const initAudioPlayer = () => {
  let currentTrackIndex = 0;
  let isPlaying = false;

  // DOM Elements
  const audio = document.getElementById('audio-element');
  const playPauseBtn = document.getElementById('btn-play-pause');
  const playIcon = document.getElementById('play-icon');
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  
  const playerTitle = document.getElementById('player-title');
  const playerArtist = document.getElementById('player-artist');
  const playerArt = document.getElementById('player-art');
  
  const timeCurrent = document.getElementById('time-current');
  const timeTotal = document.getElementById('time-total');
  const timeline = document.getElementById('timeline');
  const timeProgress = document.getElementById('time-progress');
  const timeHandle = document.getElementById('time-handle');
  
  const volumeControl = document.getElementById('volume-control');
  const volumeProgress = document.getElementById('volume-progress');
  const volumeIcon = document.getElementById('volume-icon');
  
  const playlistTracks = document.querySelectorAll('.playlist-track');

  // Track Data (Extracted from DOM)
  const playlist = Array.from(playlistTracks).map(trackEl => {
    return {
      title: trackEl.querySelector('.track-title') ? trackEl.querySelector('.track-title').textContent : '',
      artist: trackEl.querySelector('.track-desc') ? trackEl.querySelector('.track-desc').textContent : '',
      src: trackEl.getAttribute('data-src')
    };
  });

  // 1. Initial State Load
  const loadTrack = (index) => {
    currentTrackIndex = index;
    const track = playlist[index];
    
    // Ensure the src is properly URI encoded for live sites
    audio.src = encodeURI(track.src);
    playerTitle.textContent = track.title;
    playerArtist.textContent = track.artist;
    
    // Reset timeline progress visual
    timeProgress.style.width = '0%';
    timeHandle.style.left = '0%';
    timeCurrent.textContent = '0:00';
    timeTotal.textContent = '0:00';

    // Highlight active track in playlist
    playlistTracks.forEach((trackEl, i) => {
      if (i === index) {
        trackEl.classList.add('active');
      } else {
        trackEl.classList.remove('active');
      }
    });
  };

  // 2. Play / Pause Control
  const togglePlay = () => {
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => console.log('Audio playback failed: ', err));
    }
  };

  audio.addEventListener('play', () => {
    isPlaying = true;
    playIcon.className = 'fa-solid fa-pause';
  });

  audio.addEventListener('pause', () => {
    isPlaying = false;
    playIcon.className = 'fa-solid fa-play';
  });

  playPauseBtn.addEventListener('click', togglePlay);

  // 3. Skip Controls (Prev / Next)
  const prevTrack = () => {
    let index = currentTrackIndex - 1;
    if (index < 0) index = playlist.length - 1;
    loadTrack(index);
    audio.play().catch(e => {});
  };

  const nextTrack = () => {
    let index = currentTrackIndex + 1;
    if (index >= playlist.length) index = 0;
    loadTrack(index);
    audio.play().catch(e => {});
  };

  prevBtn.addEventListener('click', prevTrack);
  nextBtn.addEventListener('click', nextTrack);
  audio.addEventListener('ended', nextTrack); // Auto play next track when current ends

  // 4. Timeline Progress Updates
  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  audio.addEventListener('loadedmetadata', () => {
    timeTotal.textContent = formatTime(audio.duration || 0);
  });

  audio.addEventListener('timeupdate', () => {
    if (!audio.duration) return;
    const percentage = (audio.currentTime / audio.duration) * 100;
    timeProgress.style.width = `${percentage}%`;
    timeHandle.style.left = `${percentage}%`;
    timeCurrent.textContent = formatTime(audio.currentTime);
  });

  // 5. Timeline Scrubbing (Click/Drag to Seek)
  const setTimelineProgress = (e) => {
    const rect = timeline.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const seekPercentage = Math.max(0, Math.min(clickX / width, 1));
    
    if (audio.duration && isFinite(audio.duration)) {
      audio.currentTime = seekPercentage * audio.duration;
    }
  };

  let isDraggingTimeline = false;

  timeline.addEventListener('mousedown', (e) => {
    isDraggingTimeline = true;
    setTimelineProgress(e);
  });

  // 6. Volume Adjustments
  const setVolumeProgress = (e) => {
    const rect = volumeControl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const volumePercentage = Math.max(0, Math.min(clickX / width, 1));
    
    audio.volume = volumePercentage;
    volumeProgress.style.width = `${volumePercentage * 100}%`;

    // Update volume icons
    if (volumePercentage === 0) {
      volumeIcon.className = 'fa-solid fa-volume-xmark';
    } else if (volumePercentage < 0.5) {
      volumeIcon.className = 'fa-solid fa-volume-low';
    } else {
      volumeIcon.className = 'fa-solid fa-volume-high';
    }
  };

  let isDraggingVolume = false;

  volumeControl.addEventListener('mousedown', (e) => {
    isDraggingVolume = true;
    setVolumeProgress(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDraggingTimeline) {
      setTimelineProgress(e);
    }
    if (isDraggingVolume) {
      setVolumeProgress(e);
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDraggingTimeline) {
      isDraggingTimeline = false;
    }
    if (isDraggingVolume) {
      isDraggingVolume = false;
    }
  });

  // 7. Playlist Item Selection
  playlistTracks.forEach((trackEl, index) => {
    // Click track row to play
    trackEl.addEventListener('click', (e) => {
      loadTrack(index);
      audio.play().catch(err => {});
    });
  });

  // Set default first track
  loadTrack(0);
};

if (document.getElementById('audio-element')) {
  initAudioPlayer();
} else {
  document.addEventListener('sections-loaded', initAudioPlayer);
}
