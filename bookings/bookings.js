// Sleepy Hollows Studio - Online Session Booking & Checkout
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  // Config & Environment
  const config = window.ENV || {};
  let supabase = null;
  if (window.supabase && config.SUPABASE_URL && config.SUPABASE_ANON_KEY) {
    try {
      supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    } catch (e) {
      console.warn("Supabase client init failed:", e);
    }
  }

  // Booking Packages & Cart Definition
  const packages = {
    "recording-half": {
      title: "Recording / Mixing (Half Day)",
      category: "recording",
      price: 300,
      duration: "4 hours w/ engineer (30m break)",
      description: "Acoustically tuned live room & vocal booths, world-class mics & preamps, professional engineer included.",
      qty: 0
    },
    "recording-full": {
      title: "Recording / Mixing (Full Day)",
      category: "recording",
      price: 600,
      duration: "9 hours w/ engineer (60m break)",
      description: "Full-day studio lockout, multitrack tracking, editing, comping, and rough mix preview w/ engineer.",
      qty: 0
    },
    "rehearsal-half": {
      title: "Rehearsal Space (Half Day)",
      category: "rehearsal",
      price: 200,
      duration: "4 hours w/ engineer (30m break)",
      description: "Full backline included (drums, guitar/bass rigs, PA system & mics). Ideal for band prep & tight run-throughs.",
      qty: 0
    },
    "rehearsal-full": {
      title: "Rehearsal Space (Full Day)",
      category: "rehearsal",
      price: 350,
      duration: "9 hours w/ engineer (60m break)",
      description: "Full studio lockout for band pre-production, album rehearsal, and live performance staging. Full backline included.",
      qty: 0
    },
    "mix-master-single": {
      title: "Single Track Mixing & Mastering",
      category: "mastering",
      price: 150,
      duration: "2–3 days turnaround",
      description: "Hybrid analog console summing, precision EQ & dynamics, stereo imaging, and streaming-ready loudness.",
      qty: 0
    },
    "mix-master-ep": {
      title: "EP / Mixtape Mixing & Mastering (Up to 4 Tracks)",
      category: "mastering",
      price: 500,
      duration: "5–7 days turnaround",
      description: "Up to 4 songs. Cohesive sonic balance, track-to-track level matching, and radio/DSPs ready delivery.",
      qty: 0
    },
    "mix-master-album": {
      title: "Full Album Mixing & Mastering (Up to 10 Tracks)",
      category: "mastering",
      price: 1100,
      duration: "7–10 days turnaround",
      description: "Up to 10 songs. Complete album mastering, sequencing, spacing, DDP image + high-res WAV delivery.",
      qty: 0
    },
    "addon-stems": {
      title: "Multitrack Stems & Project Archive Delivery",
      category: "addon",
      price: 50,
      duration: "Digital archive",
      description: "Consolidated 24-bit/48kHz WAV audio stems + complete DAW session archive for your records.",
      qty: 0
    },
    "addon-extra-hour": {
      title: "Additional Studio / Engineer Hour",
      category: "addon",
      price: 75,
      duration: "1 hour extension",
      description: "Additional hourly studio time beyond the standard scheduled block.",
      qty: 0
    }
  };

  // Step Management State
  let currentStep = 1;
  const stepTitles = {
    1: "PACKAGES",
    2: "DETAILS",
    3: "CHECKOUT"
  };

  // DOM Elements
  const bookingForm = document.getElementById("booking-form");
  const cartTableBody = document.getElementById("cart-items-body");
  const cartTotalVal = document.getElementById("cart-total-val");
  const summaryDate = document.getElementById("summary-date-display");
  const summaryTime = document.getElementById("summary-time-display");
  const summaryStepBadge = document.getElementById("summary-step-badge");
  const checkoutNotice = document.getElementById("checkout-validation-notice");
  const dateInput = document.getElementById("booking-date");
  const timeSelect = document.getElementById("booking-time");
  const artistInput = document.getElementById("booking-artist");
  const receiptModal = document.getElementById("receipt-modal");
  const btnCloseReceipt = document.getElementById("btn-close-receipt");

  // Custom Step Alert Modal Dialog Elements
  const stepAlertDialog = document.getElementById("step-alert-dialog");
  const stepAlertCloseBtn = document.getElementById("step-alert-close-btn");
  const stepAlertDismissBtn = document.getElementById("step-alert-dismiss-btn");
  const stepAlertActionBtn = document.getElementById("step-alert-action-btn");
  const stepAlertBadge = document.getElementById("step-alert-badge");
  const stepAlertTitle = document.getElementById("step-alert-title");
  const stepAlertMessage = document.getElementById("step-alert-message");
  const stepAlertHintText = document.getElementById("step-alert-hint-text");
  const stepAlertActionText = document.getElementById("step-alert-action-text");
  const stepAlertIcon = document.getElementById("step-alert-icon");
  let dialogActionCallback = null;

  // Stepper Elements
  const stepTabs = [
    document.getElementById("step-tab-1"),
    document.getElementById("step-tab-2"),
    document.getElementById("step-tab-3")
  ];
  const stepPanels = [
    document.getElementById("step-panel-1"),
    document.getElementById("step-panel-2"),
    document.getElementById("step-panel-3")
  ];
  const stepDividers = [
    document.getElementById("step-divider-1"),
    document.getElementById("step-divider-2")
  ];

  // Restrict date input to tomorrow or later
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");
    dateInput.min = `${yyyy}-${mm}-${dd}`;
  }

  // Pre-select service based on URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const requestedService = urlParams.get("service");
  if (requestedService) {
    if (requestedService.includes("recording")) {
      packages["recording-half"].qty = 1;
    } else if (requestedService.includes("rehearsal")) {
      packages["rehearsal-half"].qty = 1;
    } else if (requestedService.includes("master") || requestedService.includes("mix")) {
      packages["mix-master-single"].qty = 1;
    }
  }

  // Setup Package Quantity Increment/Decrement Listeners
  const packageRows = document.querySelectorAll(".package-item-row");
  packageRows.forEach(row => {
    const pkgId = row.getAttribute("data-package-id");
    if (!pkgId || !packages[pkgId]) return;

    const decBtn = row.querySelector(".dec-qty");
    const incBtn = row.querySelector(".inc-qty");
    const qtyInput = row.querySelector(".qty-val");

    // Initialize with preselected state
    if (qtyInput) {
      qtyInput.value = packages[pkgId].qty;
    }
    if (packages[pkgId].qty > 0) {
      row.classList.add("selected");
    }

    if (decBtn) {
      decBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (packages[pkgId].qty > 0) {
          packages[pkgId].qty--;
          if (qtyInput) qtyInput.value = packages[pkgId].qty;
          if (packages[pkgId].qty === 0) {
            row.classList.remove("selected");
          }
          updateCart();
        }
      });
    }

    if (incBtn) {
      incBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (packages[pkgId].qty < 10) {
          packages[pkgId].qty++;
          if (qtyInput) qtyInput.value = packages[pkgId].qty;
          row.classList.add("selected");
          updateCart();
        }
      });
    }
  });

  // Calculate cart totals
  function calculateTotal() {
    let total = 0;
    Object.keys(packages).forEach(id => {
      total += packages[id].qty * packages[id].price;
    });
    return total;
  }

  // Update Cart and Checkout View
  function updateCart() {
    const total = calculateTotal();
    let hasItems = false;

    if (cartTableBody) {
      cartTableBody.innerHTML = "";
      Object.keys(packages).forEach(id => {
        const item = packages[id];
        if (item.qty > 0) {
          hasItems = true;
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>
              <strong>${item.title}</strong>
              <div style="font-size: 0.75rem; color: var(--color-text-secondary);">${item.duration}</div>
            </td>
            <td style="text-align: right; vertical-align: middle;">x${item.qty}</td>
            <td style="text-align: right; vertical-align: middle; font-weight: 600; color: var(--color-accent);">$${(item.qty * item.price).toFixed(2)}</td>
          `;
          cartTableBody.appendChild(tr);
        }
      });

      if (!hasItems) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td colspan="3" style="text-align: center; color: var(--color-text-muted); padding: var(--space-md) 0;">
            <em>No session packages selected yet. Choose an option on the left.</em>
          </td>
        `;
        cartTableBody.appendChild(tr);
      }
    }

    if (cartTotalVal) {
      cartTotalVal.textContent = `$${total.toFixed(2)}`;
    }

    // Update Schedule Preview
    if (summaryDate && dateInput) {
      summaryDate.textContent = dateInput.value ? formatDate(dateInput.value) : "Select in Step 2";
    }
    if (summaryTime && timeSelect) {
      summaryTime.textContent = timeSelect.value || "Select in Step 2";
    }

    updateStepReviewBox();
    validateAndToggleCheckout();
  }

  // Update Quick Review Box in Step 3
  function updateStepReviewBox() {
    const reviewPackages = document.getElementById("review-selected-packages");
    const reviewArtist = document.getElementById("review-artist-name");
    const reviewDate = document.getElementById("review-session-date");
    const reviewTime = document.getElementById("review-session-time");

    if (reviewPackages) {
      const selected = [];
      Object.keys(packages).forEach(id => {
        if (packages[id].qty > 0) {
          selected.push(`${packages[id].title} (x${packages[id].qty})`);
        }
      });
      reviewPackages.textContent = selected.length > 0 ? selected.join(", ") : "None selected";
    }

    if (reviewArtist && artistInput) {
      reviewArtist.textContent = artistInput.value || "Not specified";
    }

    if (reviewDate && dateInput) {
      reviewDate.textContent = dateInput.value ? formatDate(dateInput.value) : "Flexible / To be confirmed";
    }

    if (reviewTime && timeSelect) {
      reviewTime.textContent = timeSelect.value || "Flexible";
    }
  }

  // Helper date formatter
  function formatDate(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  // ==========================================
  // Custom Step Alert Modal Dialog
  // ==========================================
  function showStepAlert({
    stepNumber = 1,
    badge = "Step 1 Required",
    title = "Session Package Required",
    message = "You must complete Step 1 by selecting at least one session package before you can go to any additional steps.",
    hint = "Use the plus (+) button next to any package or add-on on the left to make your selection.",
    actionText = "Choose a Package",
    icon = "fa-layer-group",
    onAction = null
  } = {}) {
    if (!stepAlertDialog) {
      alert(message);
      return;
    }

    if (stepAlertBadge) {
      stepAlertBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>${badge}</span>`;
    }
    if (stepAlertTitle) {
      stepAlertTitle.textContent = title;
    }
    if (stepAlertMessage) {
      stepAlertMessage.textContent = message;
    }
    if (stepAlertHintText) {
      stepAlertHintText.textContent = hint;
    }
    if (stepAlertActionText) {
      stepAlertActionText.textContent = actionText;
    }
    if (stepAlertIcon) {
      stepAlertIcon.className = `fa-solid ${icon}`;
    }

    dialogActionCallback = onAction;

    try {
      if (typeof stepAlertDialog.showModal === "function") {
        if (!stepAlertDialog.open) {
          stepAlertDialog.showModal();
        }
      } else {
        stepAlertDialog.setAttribute("open", "");
      }
    } catch (e) {
      console.warn("Could not display dialog:", e);
    }
  }

  function closeStepAlert() {
    if (!stepAlertDialog) return;
    try {
      if (typeof stepAlertDialog.close === "function") {
        if (stepAlertDialog.open) {
          stepAlertDialog.close();
        }
      } else {
        stepAlertDialog.removeAttribute("open");
      }
    } catch (e) {
      stepAlertDialog.removeAttribute("open");
    }
    dialogActionCallback = null;
  }

  if (stepAlertCloseBtn) {
    stepAlertCloseBtn.addEventListener("click", closeStepAlert);
  }
  if (stepAlertDismissBtn) {
    stepAlertDismissBtn.addEventListener("click", closeStepAlert);
  }
  if (stepAlertActionBtn) {
    stepAlertActionBtn.addEventListener("click", () => {
      const cb = dialogActionCallback;
      closeStepAlert();
      if (typeof cb === "function") {
        cb();
      }
    });
  }

  // Fallback light-dismiss for browsers without closedby support
  if (stepAlertDialog && !("closedBy" in HTMLDialogElement.prototype)) {
    stepAlertDialog.addEventListener("click", (event) => {
      if (event.target !== stepAlertDialog) return;
      const rect = stepAlertDialog.getBoundingClientRect();
      const isInside = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );
      if (!isInside) {
        closeStepAlert();
      }
    });
  }

  // ==========================================
  // Step Validation & Completion Checks
  // ==========================================
  function isStep1Complete() {
    return calculateTotal() > 0;
  }

  function isStep2Complete() {
    const hasDate = Boolean(dateInput && dateInput.value.trim() && dateInput.checkValidity());
    const hasTime = Boolean(timeSelect && timeSelect.value.trim() && timeSelect.checkValidity());
    const hasArtist = Boolean(artistInput && artistInput.value.trim() && artistInput.checkValidity());
    return hasDate && hasTime && hasArtist;
  }

  // Update Stepper Tabs (active, completed, locked states)
  function updateStepperTabs() {
    const step1Done = isStep1Complete();
    const step2Done = isStep2Complete();

    stepTabs.forEach((tab, index) => {
      if (!tab) return;
      const stepNum = index + 1;
      tab.classList.remove("active", "completed", "locked");
      tab.setAttribute("aria-selected", "false");

      if (stepNum === currentStep) {
        tab.classList.add("active");
        tab.setAttribute("aria-selected", "true");
        tab.title = `Current Step: ${stepTitles[stepNum]}`;
        const badge = tab.querySelector(".step-badge");
        if (badge) badge.textContent = stepNum;
      } else if (stepNum < currentStep) {
        tab.classList.add("completed");
        const badge = tab.querySelector(".step-badge");
        if (badge) badge.innerHTML = `<i class="fa-solid fa-check"></i>`;
        tab.title = `Completed: Click to return to ${stepTitles[stepNum]}`;
      } else {
        // Future step
        const badge = tab.querySelector(".step-badge");
        if (badge) badge.textContent = stepNum;

        if (stepNum === 2 && !step1Done) {
          tab.classList.add("locked");
          tab.title = "Step 2: Complete Step 1 to unlock";
        } else if (stepNum === 3 && (!step1Done || !step2Done)) {
          tab.classList.add("locked");
          tab.title = !step1Done ? "Step 3: Complete Step 1 to unlock" : "Step 3: Complete Step 2 to unlock";
        } else {
          tab.title = `Step ${stepNum}: ${stepTitles[stepNum]}`;
        }
      }
    });
  }

  // ==========================================
  // Stepper Transition & Navigation Logic
  // ==========================================
  function goToStep(targetStep) {
    if (targetStep < 1 || targetStep > 3) return;

    // Moving forward to future steps:
    if (targetStep > currentStep) {
      // 1. Users MUST complete Step 1 before they can go to any additional steps!
      if (!isStep1Complete()) {
        showStepAlert({
          stepNumber: 1,
          badge: "Step 1 Required",
          title: "Complete Step 1 First",
          message: "You must complete Step 1 by selecting at least one session package before you can go to any additional steps.",
          hint: "Use the plus (+) button next to any package or add-on to choose your studio service.",
          actionText: "Choose a Package",
          icon: "fa-layer-group",
          onAction: () => {
            const firstPkg = document.querySelector(".package-item-row");
            if (firstPkg) {
              firstPkg.scrollIntoView({ behavior: "smooth", block: "center" });
              firstPkg.classList.add("highlight-pulse");
              setTimeout(() => firstPkg.classList.remove("highlight-pulse"), 1400);
            }
          }
        });
        if (checkoutNotice) {
          checkoutNotice.className = "validation-notice notice-warning";
          checkoutNotice.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Step 1: Select at least one session package to proceed.`;
        }
        return;
      }

      // 2. If trying to jump to Step 3, Step 2 must be completed first
      if (targetStep === 3 && !isStep2Complete()) {
        let missingDetail = "preferred session date, time window, and artist name";
        let targetEl = dateInput;

        if (!dateInput || !dateInput.value.trim() || !dateInput.checkValidity()) {
          missingDetail = "preferred session date";
          targetEl = dateInput;
        } else if (!timeSelect || !timeSelect.value.trim() || !timeSelect.checkValidity()) {
          missingDetail = "preferred time window";
          targetEl = timeSelect;
        } else if (!artistInput || !artistInput.value.trim() || !artistInput.checkValidity()) {
          missingDetail = "artist or band name";
          targetEl = artistInput;
        }

        showStepAlert({
          stepNumber: 2,
          badge: "Step 2 Incomplete",
          title: "Session Details Required",
          message: `Please complete Step 2 by providing your ${missingDetail} before proceeding to Contact & Payment.`,
          hint: "Your scheduled session date and artist details are required to reserve the studio room.",
          actionText: currentStep === 2 ? "Fill in Details" : "Go to Step 2",
          icon: "fa-calendar-day",
          onAction: () => {
            if (currentStep !== 2) {
              goToStep(2);
            }
            if (targetEl) {
              setTimeout(() => {
                targetEl.focus();
                targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 200);
            }
          }
        });
        return;
      }
    }

    currentStep = targetStep;

    // Update Step Tabs
    updateStepperTabs();

    // Update Dividers
    if (stepDividers[0]) {
      if (currentStep >= 2) stepDividers[0].classList.add("filled");
      else stepDividers[0].classList.remove("filled");
    }
    if (stepDividers[1]) {
      if (currentStep >= 3) stepDividers[1].classList.add("filled");
      else stepDividers[1].classList.remove("filled");
    }

    // Update Step Panels
    stepPanels.forEach((panel, index) => {
      if (!panel) return;
      if (index + 1 === currentStep) {
        panel.classList.add("active");
      } else {
        panel.classList.remove("active");
      }
    });

    // Update Right Column Badge
    if (summaryStepBadge) {
      summaryStepBadge.textContent = `STEP ${currentStep} OF 3: ${stepTitles[currentStep]}`;
    }

    updateStepReviewBox();
    validateAndToggleCheckout();

    // Smooth scroll to top of booking section
    const bookingSection = document.getElementById("booking-section");
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Wire Step Buttons
  document.getElementById("btn-step-1-next")?.addEventListener("click", () => goToStep(2));
  document.getElementById("btn-step-2-prev")?.addEventListener("click", () => goToStep(1));
  document.getElementById("btn-step-2-next")?.addEventListener("click", () => goToStep(3));
  document.getElementById("btn-step-3-prev")?.addEventListener("click", () => goToStep(2));

  // Wire Tab Clicks
  stepTabs.forEach((tab, index) => {
    if (tab) {
      tab.addEventListener("click", () => goToStep(index + 1));
    }
  });

  // Real-time Form Validation & PayPal Button Toggle
  let paypalActionsRef = null;

  function validateAndToggleCheckout() {
    const total = calculateTotal();
    const isFormValid = bookingForm ? bookingForm.checkValidity() : false;

    if (checkoutNotice) {
      if (currentStep === 1) {
        if (total <= 0) {
          checkoutNotice.className = "validation-notice notice-warning";
          checkoutNotice.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> Step 1: Select at least one session package to proceed.`;
        } else {
          checkoutNotice.className = "validation-notice notice-success";
          checkoutNotice.innerHTML = `<i class="fa-solid fa-circle-check"></i> Package selected! Click 'Continue to Session Details' to choose your date & time.`;
        }
      } else if (currentStep === 2) {
        const hasDateAndTime = dateInput?.value && timeSelect?.value && artistInput?.value;
        if (!hasDateAndTime) {
          checkoutNotice.className = "validation-notice notice-info";
          checkoutNotice.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Step 2: Choose your preferred date, time window, and artist name.`;
        } else {
          checkoutNotice.className = "validation-notice notice-success";
          checkoutNotice.innerHTML = `<i class="fa-solid fa-circle-check"></i> Details entered! Click 'Continue to Contact & Pay' to finalize.`;
        }
      } else if (currentStep === 3) {
        if (!isFormValid) {
          checkoutNotice.className = "validation-notice notice-info";
          checkoutNotice.innerHTML = `<i class="fa-solid fa-circle-info"></i> Step 3: Complete contact info and check the 24-hr policy to unlock PayPal.`;
        } else {
          checkoutNotice.className = "validation-notice notice-success";
          checkoutNotice.innerHTML = `<i class="fa-solid fa-lock"></i> All steps completed! Click the PayPal button below to confirm your booking.`;
        }
      }
    }

    if (paypalActionsRef) {
      if (total > 0 && isFormValid && currentStep === 3) {
        paypalActionsRef.enable();
      } else {
        paypalActionsRef.disable();
      }
    }
  }

  // Form input listeners
  if (bookingForm) {
    bookingForm.addEventListener("input", () => {
      updateCart();
      updateStepperTabs();
      validateAndToggleCheckout();
    });
    bookingForm.addEventListener("change", () => {
      updateCart();
      updateStepperTabs();
      validateAndToggleCheckout();
    });
  }

  // Initial cart render & tab state
  updateCart();
  updateStepperTabs();

  // Scroll to requested service category if query param is set
  if (requestedService) {
    setTimeout(() => {
      const targetElement = document.querySelector(`[data-category="${requestedService}"]`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
  }

  // ==========================================
  // PayPal Smart Buttons Integration
  // ==========================================
  const paypalClientId = config.PAYPAL_CLIENT_ID || "sb";
  let paypalLoaded = false;
  initPayPal(paypalClientId);

  function initPayPal(clientId) {
    if (paypalLoaded) return;
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    script.onload = () => {
      paypalLoaded = true;
      renderPayPalButtons();
    };
    script.onerror = () => {
      console.error("Failed to load PayPal Smart Buttons SDK.");
      const containers = [
        document.getElementById("paypal-button-container"),
        document.getElementById("paypal-step-container")
      ];
      containers.forEach(container => {
        if (container) {
          container.innerHTML = `
            <div style="color: #ff4757; padding: 10px; text-align: center; font-size: 0.9rem;">
              Unable to connect to PayPal. Please refresh the page or contact the studio directly.
            </div>
          `;
        }
      });
    };
    document.head.appendChild(script);
  }

  function renderPayPalButtons() {
    const summaryContainer = document.getElementById("paypal-button-container");
    const stepContainer = document.getElementById("paypal-step-container");
    if (!paypalLoaded || !window.paypal) return;

    // Clear containers
    if (summaryContainer) summaryContainer.innerHTML = "";
    if (stepContainer) stepContainer.innerHTML = "";

    const buttonConfig = {
      fundingSource: window.paypal.FUNDING.PAYPAL,

      onInit: function (data, actions) {
        paypalActionsRef = actions;
        const total = calculateTotal();
        const isFormValid = bookingForm ? bookingForm.checkValidity() : false;
        if (total > 0 && isFormValid && currentStep === 3) {
          actions.enable();
        } else {
          actions.disable();
        }
      },

      onClick: function () {
        if (!isStep1Complete()) {
          showStepAlert({
            stepNumber: 1,
            badge: "Step 1 Required",
            title: "Session Package Required",
            message: "You must complete Step 1 by selecting at least one session package before checking out.",
            hint: "Select a recording, rehearsal, mixing, or add-on package to proceed with your booking.",
            actionText: "Choose a Package",
            icon: "fa-layer-group",
            onAction: () => {
              goToStep(1);
            }
          });
          return;
        }

        if (!isStep2Complete()) {
          showStepAlert({
            stepNumber: 2,
            badge: "Step 2 Incomplete",
            title: "Session Details Required",
            message: "Please complete Step 2 by selecting your session date, time window, and artist name before proceeding to payment.",
            hint: "Fill out the required schedule fields to finalize your reservation.",
            actionText: "Complete Step 2",
            icon: "fa-calendar-day",
            onAction: () => {
              goToStep(2);
            }
          });
          return;
        }

        if (currentStep !== 3) {
          goToStep(3);
          return;
        }

        if (bookingForm && !bookingForm.checkValidity()) {
          const nameInput = document.getElementById("booking-name");
          const emailInput = document.getElementById("booking-email");
          const phoneInput = document.getElementById("booking-phone");
          const policyInput = document.getElementById("booking-policy");

          let missingField = "primary contact details";
          let targetEl = nameInput;

          if (!nameInput || !nameInput.value.trim() || !nameInput.checkValidity()) {
            missingField = "contact name";
            targetEl = nameInput;
          } else if (!emailInput || !emailInput.value.trim() || !emailInput.checkValidity()) {
            missingField = "email address for confirmation";
            targetEl = emailInput;
          } else if (!phoneInput || !phoneInput.value.trim() || !phoneInput.checkValidity()) {
            missingField = "phone number for session coordination";
            targetEl = phoneInput;
          } else if (policyInput && !policyInput.checked) {
            missingField = "agreement to the 24-hour cancellation policy";
            targetEl = policyInput;
          }

          showStepAlert({
            stepNumber: 3,
            badge: "Step 3 Incomplete",
            title: "Contact & Policy Required",
            message: `Please complete your ${missingField} before finalizing payment.`,
            hint: "All contact fields are required so we can send your confirmation receipt and coordinate session logistics.",
            actionText: "Complete Contact Info",
            icon: "fa-user-shield",
            onAction: () => {
              if (targetEl) {
                targetEl.focus();
                targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }
          });
        }
      },

      createOrder: function (data, actions) {
        const total = calculateTotal();
        const artist = document.getElementById("booking-artist")?.value || "Studio Client";

        return actions.order.create({
          purchase_units: [{
            amount: {
              value: total.toFixed(2)
            },
            description: `Sleepy Hollows Studio Session Booking - ${artist}`
          }]
        });
      },

      onApprove: async function (data, actions) {
        const statusDiv = document.createElement("div");
        statusDiv.id = "paypal-processing-status";
        statusDiv.innerHTML = `
          <div style="text-align: center; color: var(--color-accent); font-weight: 600; padding: var(--space-md) 0;">
            <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>
            Processing your payment and confirming your studio session...
          </div>
        `;

        if (summaryContainer) summaryContainer.style.display = "none";
        if (stepContainer) {
          stepContainer.style.display = "none";
          stepContainer.parentNode.insertBefore(statusDiv, stepContainer);
        } else if (summaryContainer) {
          summaryContainer.parentNode.insertBefore(statusDiv, summaryContainer);
        }

        try {
          const details = await actions.order.capture();
          const transactionId = details.id;

          let bookingReference = transactionId;
          if (supabase) {
            try {
              bookingReference = await saveBookingToSupabase(details);
            } catch (dbErr) {
              console.warn("Supabase booking insert encountered an error, falling back to transaction ID:", dbErr);
            }
          }

          if (document.getElementById("paypal-processing-status")) {
            document.getElementById("paypal-processing-status").remove();
          }
          if (summaryContainer) summaryContainer.style.display = "block";
          if (stepContainer) stepContainer.style.display = "block";

          // Show printable receipt modal
          showBookingReceipt(bookingReference, details);
        } catch (error) {
          if (document.getElementById("paypal-processing-status")) {
            document.getElementById("paypal-processing-status").remove();
          }
          if (summaryContainer) summaryContainer.style.display = "block";
          if (stepContainer) stepContainer.style.display = "block";

          console.error("Booking transaction failed:", error);
          const errorHtml = `
            <div style="text-align: center; color: #ff4757; padding: var(--space-md); border: 1px solid rgba(255, 71, 87, 0.5); border-radius: var(--border-radius-sm); margin-bottom: var(--space-md); background: rgba(255, 71, 87, 0.1);">
              <i class="fa-solid fa-triangle-exclamation" style="margin-bottom: 8px; font-size: 1.5rem;"></i><br>
              <strong>Payment Error:</strong> ${error.message || "Transaction failed."}<br>
              <p style="font-size: 0.85rem; margin-top: 5px; color: var(--color-text-secondary);">If you were charged, please contact Sleepy Hollows at (703) 887-6509.</p>
              <button class="btn btn-secondary btn-sm" id="btn-retry-paypal" style="margin-top: 10px;">Retry</button>
            </div>
          `;
          if (summaryContainer) summaryContainer.innerHTML = errorHtml;
          if (stepContainer) stepContainer.innerHTML = errorHtml;

          document.querySelectorAll("#btn-retry-paypal").forEach(btn => {
            btn.addEventListener("click", (e) => {
              e.preventDefault();
              renderPayPalButtons();
            });
          });
        }
      },

      onError: function (err) {
        if (document.getElementById("paypal-processing-status")) {
          document.getElementById("paypal-processing-status").remove();
        }
        if (summaryContainer) summaryContainer.style.display = "block";
        if (stepContainer) stepContainer.style.display = "block";

        console.error("PayPal Error execution:", err);
        const errHtml = `
          <div style="text-align: center; color: #ff4757; padding: var(--space-md); border: 1px solid rgba(255, 71, 87, 0.5); border-radius: var(--border-radius-sm); margin-bottom: var(--space-md); background: rgba(255, 71, 87, 0.1);">
            <i class="fa-solid fa-triangle-exclamation" style="margin-bottom: 8px; font-size: 1.5rem;"></i><br>
            <strong>PayPal Notice:</strong> ${err.message || "An error occurred during checkout."}<br>
            <button class="btn btn-secondary btn-sm" id="btn-retry-paypal-err" style="margin-top: 10px;">Retry</button>
          </div>
        `;
        if (summaryContainer) summaryContainer.innerHTML = errHtml;
        if (stepContainer) stepContainer.innerHTML = errHtml;

        document.querySelectorAll("#btn-retry-paypal-err").forEach(btn => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            renderPayPalButtons();
          });
        });
      }
    };

    // Render into step 3 container
    if (stepContainer) {
      window.paypal.Buttons(buttonConfig).render("#paypal-step-container");
    }
    // Also render into sticky summary container on desktop
    if (summaryContainer) {
      window.paypal.Buttons(buttonConfig).render("#paypal-button-container");
    }
  }

  // Save Booking to Supabase
  async function saveBookingToSupabase(paypalDetails) {
    const contactName = document.getElementById("booking-name")?.value || "";
    const contactEmail = document.getElementById("booking-email")?.value || "";
    const contactPhone = document.getElementById("booking-phone")?.value || "";
    const artistName = document.getElementById("booking-artist")?.value || "";
    const genre = document.getElementById("booking-genre")?.value || "";
    const sessionDate = document.getElementById("booking-date")?.value || null;
    const sessionTime = document.getElementById("booking-time")?.value || "";
    const notes = document.getElementById("booking-notes")?.value || "";
    const total = calculateTotal();

    const bookingId = crypto.randomUUID();

    // 1. Insert studio_bookings
    const { error: bookingErr } = await supabase
      .from("studio_bookings")
      .insert([{
        id: bookingId,
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        artist_name: artistName,
        genre: genre,
        session_date: sessionDate,
        session_time: sessionTime,
        notes: notes,
        total_amount: total,
        payment_reference: paypalDetails.id,
        payment_status: "paid"
      }]);

    if (bookingErr) throw bookingErr;

    // 2. Insert studio_booking_items
    const items = [];
    Object.keys(packages).forEach(id => {
      const pkg = packages[id];
      if (pkg.qty > 0) {
        items.push({
          booking_id: bookingId,
          package_id: id,
          package_title: pkg.title,
          quantity: pkg.qty,
          price_per_item: pkg.price
        });
      }
    });

    if (items.length > 0) {
      const { error: itemsErr } = await supabase
        .from("studio_booking_items")
        .insert(items);
      if (itemsErr) console.warn("Items insert error:", itemsErr);
    }

    // 3. Trigger email confirmation if available
    try {
      await supabase.functions.invoke("send-confirmation-email", {
        body: {
          regId: bookingId,
          contactName: contactName,
          contactEmail: contactEmail,
          total: total,
          items: items.map(i => ({ title: i.package_title, qty: i.quantity, price: i.price_per_item })),
          bookingDetails: {
            artistName: artistName,
            genre: genre,
            sessionDate: sessionDate,
            sessionTime: sessionTime
          }
        }
      });
    } catch (fnErr) {
      console.warn("Could not send confirmation email via edge function:", fnErr);
    }

    return bookingId;
  }

  // Show Booking Receipt Modal
  function showBookingReceipt(referenceId, paypalDetails) {
    if (!receiptModal) return;

    const receiptIdSpan = document.getElementById("receipt-id-val");
    const receiptItemsContainer = document.getElementById("receipt-items-list");
    const receiptTotalSpan = document.getElementById("receipt-total-val");
    const receiptClientDetails = document.getElementById("receipt-client-details");

    const shortId = typeof referenceId === "string" && referenceId.length > 8
      ? referenceId.substring(0, 8).toUpperCase()
      : (referenceId || "SH-SESSION");

    if (receiptIdSpan) {
      receiptIdSpan.textContent = `#SH-BOOK-${shortId}`;
    }

    if (receiptItemsContainer) {
      receiptItemsContainer.innerHTML = "";
      Object.keys(packages).forEach(id => {
        const item = packages[id];
        if (item.qty > 0) {
          const div = document.createElement("div");
          div.className = "receipt-line";
          div.innerHTML = `
            <span>${item.title} (x${item.qty})</span>
            <span style="font-weight: 600;">$${(item.qty * item.price).toFixed(2)}</span>
          `;
          receiptItemsContainer.appendChild(div);
        }
      });
    }

    if (receiptTotalSpan) {
      receiptTotalSpan.textContent = `$${calculateTotal().toFixed(2)}`;
    }

    if (receiptClientDetails) {
      const name = document.getElementById("booking-name")?.value || "";
      const email = document.getElementById("booking-email")?.value || "";
      const phone = document.getElementById("booking-phone")?.value || "";
      const artist = document.getElementById("booking-artist")?.value || "";
      const date = document.getElementById("booking-date")?.value || "Flexible / TBD";
      const time = document.getElementById("booking-time")?.value || "";

      receiptClientDetails.innerHTML = `
        <div class="receipt-line"><span>Artist / Project:</span><strong>${artist || "N/A"}</strong></div>
        <div class="receipt-line"><span>Primary Contact:</span><span>${name} (${email})</span></div>
        <div class="receipt-line"><span>Phone:</span><span>${phone}</span></div>
        <div class="receipt-line"><span>Scheduled Date:</span><span>${formatDate(date)}</span></div>
        <div class="receipt-line"><span>Time Window:</span><span>${time}</span></div>
        <div class="receipt-line"><span>Studio Address:</span><span>Historic Herndon, VA 20170</span></div>
      `;
    }

    receiptModal.style.display = "flex";
  }

  // Modal Close Listener
  if (btnCloseReceipt && receiptModal) {
    btnCloseReceipt.addEventListener("click", () => {
      receiptModal.style.display = "none";
      window.location.href = "../";
    });
  }
});
