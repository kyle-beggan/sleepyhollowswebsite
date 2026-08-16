/* Sleepy Hollows Custom Audio Player Script */

document.addEventListener('sections-loaded', () => {
  // Track Data
  const playlist = [
    {
      title: 'Night Signals',
      artist: 'The Blackwoods',
      src: 'assets/audio/live1.mp3',
      lyrics: `[Verse 1]
Under the signals of the night,
We chased the neon shadows out of sight.
In the silence of the hollow wood,
We built a family, misunderstood.

[Chorus]
Hear the signals calling out your name,
Through the darkness, nothing stays the same.
A simple beat, a chord upon the wire,
We burn together in the creative fire.

[Verse 2]
The tape is rolling, capture every breath,
A song of life, a melody for death.
We track the memories, we print the sound,
Under the hollows, where the truth is found.`
    },
    {
      title: 'Golden Hollows',
      artist: 'Sleepy Hollows Sessions',
      src: 'assets/audio/live2.mp3',
      lyrics: `[Verse 1]
Take me back to the golden hall,
Where the autumn colors rise and fall.
Through the pines where the breezes blow,
Under sleepy hollows, long ago.

[Chorus]
Golden hollows, shine your gentle light,
Guide our voices through the quiet night.
A rustic room where the acoustic plays,
Warm as wood and sweet as bygone days.

[Verse 2]
An isolated room, a single mic,
Catching every vibration that you like.
We gather close, we let the music lead,
This second home is everything we need.`
    },
    {
      title: 'Historic Heart',
      artist: 'Herndon Roots',
      src: 'assets/audio/live3.mp3',
      lyrics: `[Verse 1]
Historic heart beating slow and deep,
Promises we made and vows to keep.
Herndon streets in the morning light,
A song that echoes through the night.

[Chorus]
Historic heart, sing your legacy,
Mixed and mastered for eternity.
We take the old, we blend it with the new,
A hybrid frequency, honest and true.

[Verse 2]
The meters bounce, the analog dials turn,
Lessons in the sound we had to learn.
From bedroom starts to these brick walls,
The music rings out, as the twilight falls.`
    }
  ];

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
  const lyricsBox = document.getElementById('lyrics-box');
  const lyricsTitle = document.getElementById('lyrics-title');
  const lyricsContent = document.getElementById('lyrics-content');

  // 1. Initial State Load
  const loadTrack = (index) => {
    currentTrackIndex = index;
    const track = playlist[index];
    
    audio.src = track.src;
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

    // If lyrics box is open, update lyrics content
    if (lyricsBox.classList.contains('active')) {
      lyricsTitle.textContent = `Lyrics: ${track.title}`;
      lyricsContent.textContent = track.lyrics;
    }
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
    if (isPlaying) audio.play().catch(e => {});
  };

  const nextTrack = () => {
    let index = currentTrackIndex + 1;
    if (index >= playlist.length) index = 0;
    loadTrack(index);
    if (isPlaying) audio.play().catch(e => {});
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
    
    if (audio.duration) {
      audio.currentTime = seekPercentage * audio.duration;
    }
  };

  timeline.addEventListener('click', setTimelineProgress);

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

  volumeControl.addEventListener('click', setVolumeProgress);

  // 7. Playlist Item Selection
  playlistTracks.forEach((trackEl, index) => {
    // Click track row to play
    trackEl.addEventListener('click', (e) => {
      // Don't trigger play if clicked on lyrics button or download link
      if (e.target.classList.contains('btn-lyrics') || e.target.closest('a') || e.target.closest('.btn-lyrics')) {
        return;
      }
      
      loadTrack(index);
      audio.play().catch(err => {});
    });
  });

  // 8. Lyrics Toggling Box
  const lyricButtons = document.querySelectorAll('.btn-lyrics');
  
  lyricButtons.forEach((btn, index) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Stop playlist row click
      
      // If lyrics are already active for this specific track, close it
      if (currentTrackIndex === index && lyricsBox.classList.contains('active')) {
        lyricsBox.classList.remove('active');
        return;
      }

      // Otherwise, load this track (or remain if active) and show lyrics
      loadTrack(index);
      lyricsTitle.textContent = `Lyrics: ${playlist[index].title}`;
      lyricsContent.textContent = playlist[index].lyrics;
      lyricsBox.classList.add('active');
      
      // Smooth scroll to lyrics box
      lyricsBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  // Set default first track
  loadTrack(0);
});
