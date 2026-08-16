/* Sleepy Hollows Studio Main Script */

document.addEventListener('DOMContentLoaded', () => {
  
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

  // 4. Gear Filter Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');

      // Clear active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

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
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Get form data
      const formData = new FormData(bookingForm);
      const bookingData = {
        name: formData.get('name'),
        email: formData.get('email'),
        service: formData.get('service'),
        date: formData.get('date'),
        message: formData.get('message')
      };

      // Mock console output
      console.log('Mock Form Submission Received:', bookingData);

      // Disable button during submit transition simulation
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;

      // Simulate network request latency
      setTimeout(() => {
        submitBtn.textContent = 'Request Sent!';
        successMsg.style.display = 'block';
        bookingForm.reset();
        
        // Reset button state
        setTimeout(() => {
          submitBtn.textContent = 'Submit Request';
          submitBtn.disabled = false;
        }, 3000);
      }, 1000);
    });
  }
});
