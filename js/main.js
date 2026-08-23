async function loadSections() {
  const includes = document.querySelectorAll('[data-include]');
  
  // Calculate correct base URL for relative fetches (handling subpaths and missing trailing slashes)
  const loc = window.location;
  let path = loc.pathname;
  const lastSegment = path.substring(path.lastIndexOf('/') + 1);
  if (path && !path.endsWith('/') && !lastSegment.includes('.')) {
    path += '/';
  } else {
    path = path.substring(0, path.lastIndexOf('/') + 1);
  }
  const baseUrl = loc.origin + path;

  const promises = Array.from(includes).map(async (el) => {
    const relativeFile = el.getAttribute('data-include');
    const file = new URL(relativeFile + '?v=1.0.12', baseUrl).href;
    try {
      const response = await fetch(file);
      if (response.ok) {
        el.innerHTML = await response.text();
      } else {
        el.innerHTML = `<div style="padding: 20px; color: var(--color-accent);">Error loading: ${relativeFile}</div>`;
      }
    } catch (err) {
      el.innerHTML = `<div style="padding: 20px; color: var(--color-accent);">Connection error: ${relativeFile}</div>`;
    }
  });
  await Promise.all(promises);
}

document.addEventListener('DOMContentLoaded', async () => {
  // Load modular HTML sections
  await loadSections();

  // Fire event to notify other scripts (like audio-player.js) that elements are ready
  document.dispatchEvent(new Event('sections-loaded'));
  
  // 1. Preloader Fade-out
  const preloader = document.getElementById('preloader');
  if (preloader) {
    // Small delay for smooth entry
    setTimeout(() => {
      preloader.classList.add('fade-out');
    }, 400);
  }

  // 2. Sticky Header Scroll Effect
  const header = document.getElementById('header');
  const checkScroll = () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', checkScroll);
  checkScroll(); // Initial run on load

  // 3. Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobile-toggle');
  const navMenu = document.getElementById('menu');
  
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      mobileToggle.classList.toggle('active');
      
      // Animate burger lines
      const lines = mobileToggle.querySelectorAll('span');
      if (mobileToggle.classList.contains('active')) {
        lines[0].style.transform = 'translateY(7px) rotate(45deg)';
        lines[1].style.opacity = '0';
        lines[2].style.transform = 'translateY(-7px) rotate(-45deg)';
      } else {
        lines[0].style.transform = 'none';
        lines[1].style.opacity = '1';
        lines[2].style.transform = 'none';
      }
    });

    // Close menu when clicking links
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        mobileToggle.classList.remove('active');
        const lines = mobileToggle.querySelectorAll('span');
        lines[0].style.transform = 'none';
        lines[1].style.opacity = '1';
        lines[2].style.transform = 'none';
      });
    });
  }

  // 4. Filter Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const container = button.closest('.tabs-container');
      if (!container) return;

      const targetTab = button.getAttribute('data-tab');

      // Clear active states inside this container only
      container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

      // Apply active states
      button.classList.add('active');
      const targetContent = document.getElementById(targetTab);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });

  // 5. Active Link Highlighting on Scroll
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.main-menu a');

  window.addEventListener('scroll', () => {
    let currentSectionId = '';

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      // Trigger a bit before center
      if (window.scrollY >= (sectionTop - 180)) {
        currentSectionId = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentSectionId}`) {
        link.classList.add('active');
      }
    });
  });

  // 6. Booking/Contact Form Submission Handler
  const bookingForm = document.getElementById('booking-form');
  const successMsg = document.getElementById('form-success');

  if (bookingForm && successMsg) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(bookingForm);
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;
      successMsg.style.display = 'none';

      try {
        const response = await fetch('https://formspree.io/f/mwlezjdv', {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          submitBtn.textContent = 'Request Sent!';
          successMsg.style.display = 'block';
          bookingForm.reset();
        } else {
          const data = await response.json();
          console.error('Form submission error:', data);
          alert('Oops! There was a problem submitting your form.');
        }
      } catch (error) {
        console.error('Network error:', error);
        alert('Oops! There was a problem submitting your form. Please check your connection.');
      } finally {
        setTimeout(() => {
          submitBtn.textContent = 'Submit Request';
          submitBtn.disabled = false;
        }, 4000);
      }
    });
  }

  // 7. Dynamic Social Media Feeds (YouTube Feed)

  // YouTube Fallback & Historical Video Data (Actual video IDs from the channel)
  const youtubeFallback = [
    { videoId: 'pIE7e7QrETs', title: 'Mackenzie Ryan - Cover Set', desc: 'Live Session at the Hollows' },
    { videoId: 'v069tdyPEYs', title: 'Olivia Dean - Man I Need (Cover)', desc: 'Live Session performance' },
    { videoId: '1-0ucBoxABQ', title: 'Studio Rehearsal Live Session', desc: 'Tracking live band performance' },
    { videoId: '3Pd8cvhBtQY', title: 'Studio Mixing Dials & Meters', desc: 'Analog console mixing details' },
    { videoId: '3anrRWXNN3I', title: 'Golden Hollows Session Set', desc: 'Acoustic folk tracking session' },
    { videoId: '9-AhP98SRpQ', title: 'Studio Tour - Equipment Tour', desc: 'Hybrid analog/digital tour' },
    { videoId: 'DbyODWlUnJg', title: 'Guitar Tracking Setup tips', desc: 'Cozy session tracking guitar amp' },
    { videoId: 'FDwll2uOt2A', title: 'Vocal Microphones Shootout', desc: 'Neumann U87 studio session' },
    { videoId: 'KbjIZwYFAsA', title: 'Rehearsal space session', desc: 'Live band tracking rehearsal reels' },
    { videoId: 'Kv0nIIa2zG0', title: 'Outboard analog gear demo', desc: 'Dialing in compression racks' },
    { videoId: 'LjLqaTS27Ds', title: 'Late night console details', desc: 'VU meters glowing console details' },
    { videoId: 'MtlNNsqkHFw', title: 'Behind the Scenes: Mixing', desc: 'Control room tracking dials' },
    { videoId: 'O4YWs8AKfAw', title: 'Dangerous Music Monitor routing', desc: 'Outboard and monitoring setup' },
    { videoId: 'OTeJrXJhcuc', title: 'Featured Singer-Songwriter Set', desc: 'August Black live performance' },
    { videoId: 'S-fPuKW9LeY', title: 'Live Performance Session 3', desc: 'Featured cover performances' },
    { videoId: 'TD7M3IrS7hk', title: 'Live Session Original Track', desc: 'Local artist tracking' },
    { videoId: 'VZoOBJemJzI', title: 'Vocal Recording Session Walkthrough', desc: 'Vocal booth setups and tracking' },
    { videoId: 'X9YSmmjjrUw', title: 'Taylor Acoustic Guitar setup', desc: 'Cozy acoustic tracking setups' },
    { videoId: 'byNgJytgJXA', title: 'Historic Herndon studio vibes', desc: 'Inside the live room setup' },
    { videoId: 'fVTNVrzWQlc', title: 'Featured Artist live cover', desc: 'Pink Floyd Time cover performance' }
  ];

  const channelId = 'UC6OaUzL3BMgV6x_AsPy39bg';
  const uploadsPlaylistId = 'UU6OaUzL3BMgV6x_AsPy39bg'; // Channel ID with UU instead of UC
  const itemsPerPage = 8;
  
  let loadedVideosCount = 0;
  let fetchedYouTubeVideos = [];
  let nextYouTubePageToken = "";
  let isUsingAPIKey = false;

  // Initialize and check credentials
  if (typeof CONFIG !== 'undefined' && CONFIG.YOUTUBE_API_KEY && CONFIG.YOUTUBE_API_KEY !== 'YOUR_YOUTUBE_API_KEY_HERE') {
    isUsingAPIKey = true;
  }

  // YouTube Gallery Card Builder
  function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = 'video-card card-glass';
    card.innerHTML = `
      <div class="video-embed-container">
        <iframe src="https://www.youtube.com/embed/${video.videoId}?rel=0&playsinline=1"
          title="${video.title}" frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen loading="lazy"></iframe>
      </div>
      <div class="video-info">
        <h4 class="video-title uppercase">${video.title}</h4>
        <p class="video-desc">${video.desc || 'Live Performance'}</p>
      </div>
    `;
    return card;
  }

  // YouTube Gallery Renderer (Combined list)
  function renderVideos() {
    const gallery = document.getElementById('youtube-gallery');
    const loadMoreBtn = document.getElementById('btn-load-more-videos');
    if (!gallery) return;

    // Remove the pulsing logo loader if present
    const loader = gallery.querySelector('.youtube-loader');
    if (loader) {
      loader.remove();
    }

    if (isUsingAPIKey) {
      // If using the official API key, loadMoreVideos handles fetching new pages dynamically.
      // So renderVideos just appends fetchedYouTubeVideos.
      const currentCards = gallery.querySelectorAll('.video-card').length;
      const newVideos = fetchedYouTubeVideos.slice(currentCards);
      newVideos.forEach(video => {
        gallery.appendChild(createVideoCard(video));
      });
      
      // Hide button if there is no next page token and we rendered all fetched videos
      if (!nextYouTubePageToken && gallery.querySelectorAll('.video-card').length >= fetchedYouTubeVideos.length && loadMoreBtn) {
        loadMoreBtn.style.display = 'none';
      }
    } else {
      // Fallback/RSS route
      const allVideos = [...fetchedYouTubeVideos, ...youtubeFallback.slice(fetchedYouTubeVideos.length)];
      const nextVideos = allVideos.slice(loadedVideosCount, loadedVideosCount + itemsPerPage);
      
      nextVideos.forEach(video => {
        gallery.appendChild(createVideoCard(video));
      });
      
      loadedVideosCount += nextVideos.length;
      
      if (loadedVideosCount >= allVideos.length && loadMoreBtn) {
        loadMoreBtn.style.display = 'none';
      }
    }
  }

  // Fetch YouTube uploads using Official API Key
  async function loadYouTubeVideosFromAPI() {
    const loadMoreBtn = document.getElementById('btn-load-more-videos');
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?key=${CONFIG.YOUTUBE_API_KEY}&playlistId=${uploadsPlaylistId}&part=snippet&maxResults=${itemsPerPage}${nextYouTubePageToken ? `&pageToken=${nextYouTubePageToken}` : ''}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      
      nextYouTubePageToken = data.nextPageToken || "";
      
      const newVideos = data.items.map(item => {
        const snippet = item.snippet;
        const videoId = snippet.resourceId?.videoId;
        const title = snippet.title;
        let desc = snippet.description || "";
        if (desc.length > 60) {
          desc = desc.substring(0, 57) + '...';
        }
        return { videoId, title, desc };
      }).filter(v => v.videoId);
      
      fetchedYouTubeVideos.push(...newVideos);
      renderVideos();
    } catch (err) {
      console.warn("Failed to load YouTube videos from API key, switching to RSS/Local fallback:", err);
      isUsingAPIKey = false;
      loadYouTubeFeed();
    }
  }

  // Fetch YouTube uploads via RSS Proxy
  async function loadYouTubeFeed() {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      const data = await response.json();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data.contents, "text/xml");
      const entries = xmlDoc.getElementsByTagName("entry");

      fetchedYouTubeVideos = [];
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const videoId = entry.getElementsByTagName("yt:videoId")[0]?.textContent || 
                        entry.getElementsByTagName("videoId")[0]?.textContent;
        const title = entry.getElementsByTagName("title")[0]?.textContent;
        
        let desc = entry.getElementsByTagName("media:description")[0]?.textContent || "";
        if (desc.length > 60) {
          desc = desc.substring(0, 57) + '...';
        }

        if (videoId && title) {
          fetchedYouTubeVideos.push({ videoId, title, desc });
        }
      }
    } catch (err) {
      console.warn("Failed to load live YouTube RSS feed, falling back to local database list:", err);
    } finally {
      renderVideos();
    }
  }

  // Load Initial YouTube Feed
  if (isUsingAPIKey) {
    loadYouTubeVideosFromAPI();
  } else {
    loadYouTubeFeed();
  }

  // Load More Button Event Listener
  const loadMoreVideosBtn = document.getElementById('btn-load-more-videos');
  if (loadMoreVideosBtn) {
    loadMoreVideosBtn.addEventListener('click', () => {
      if (isUsingAPIKey && nextYouTubePageToken) {
        loadYouTubeVideosFromAPI();
      } else {
        renderVideos();
      }
    });
  }

  // 8. About Section Timeline Slider
  const timelineBtns = document.querySelectorAll('.timeline-node-btn');
  const timelineSlides = document.querySelectorAll('.timeline-slide');

  timelineBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const index = btn.getAttribute('data-index');

      // Update active states for buttons
      timelineBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update active states for slides
      timelineSlides.forEach(slide => slide.classList.remove('active'));
      const targetSlide = document.getElementById(`slide-${index}`);
      if (targetSlide) {
        targetSlide.classList.add('active');
      }
    });
  });
});

