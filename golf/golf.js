document.addEventListener("DOMContentLoaded", () => {
  // Preloader removal
  const preloader = document.getElementById("preloader");
  if (preloader) {
    window.addEventListener("load", () => {
      setTimeout(() => {
        preloader.classList.add("fade-out");
        setTimeout(() => {
          preloader.style.display = "none";
        }, 600);
      }, 800);
    });
  }

  // Elements Selection
  const ticketRows = document.querySelectorAll(".ticket-item-row");
  const checkoutFlow = document.getElementById("checkout-flow");
  const cartItemsBody = document.getElementById("cart-items-body");
  const cartTotalVal = document.getElementById("cart-total-val");
  const playersWrapper = document.getElementById("players-wrapper");
  const regForm = document.getElementById("registration-form");

  // Modal Elements
  const receiptModal = document.getElementById("receipt-modal");
  const receiptIdVal = document.getElementById("receipt-id-val");
  const receiptItemsList = document.getElementById("receipt-items-list");
  const receiptTotalVal = document.getElementById("receipt-total-val");
  const receiptPlayersList = document.getElementById("receipt-players-list");
  const btnCloseReceipt = document.getElementById("btn-close-receipt");

  // Keep track of quantities
  const cart = {};

  // Retrieve configurations from environment
  const config = window.ENV || {};
  const supabaseUrl = config.SUPABASE_URL;
  const supabaseAnonKey = config.SUPABASE_ANON_KEY;
  const paypalClientId = config.PAYPAL_CLIENT_ID || "sb";

  // Initialize Supabase Client
  let supabase = null;
  const isSupabaseConfigured = supabaseUrl &&
    supabaseUrl !== "YOUR_SUPABASE_PROJECT_URL" &&
    supabaseAnonKey &&
    supabaseAnonKey !== "YOUR_SUPABASE_ANON_KEY";

  if (isSupabaseConfigured) {
    try {
      supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
      console.error("Failed to initialize Supabase client:", e);
    }
  } else {
    console.warn("Supabase API keys are not configured in golf/config.js. Database logs will be skipped.");
  }

  // Initialize PayPal SDK loading
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
    };
    document.head.appendChild(script);
  }

  function renderPayPalButtons() {
    const container = document.getElementById("paypal-button-container");
    if (!container || !paypalLoaded) return;

    // Reset container markup
    container.innerHTML = "";

    window.paypal.Buttons({
      fundingSource: window.paypal.FUNDING.PAYPAL,
      onInit: function (data, actions) {
        // Disable by default until form validation succeeds
        actions.disable();

        const validateForm = () => {
          if (regForm.checkValidity()) {
            actions.enable();
          } else {
            actions.disable();
          }
        };

        regForm.addEventListener("input", validateForm);
        // Custom event triggered whenever players input subform updates
        document.addEventListener("playerFormUpdated", validateForm);
      },

      onClick: function () {
        if (!regForm.checkValidity()) {
          regForm.reportValidity();
        }
      },

      createOrder: function (data, actions) {
        let total = 0;
        Object.keys(cart).forEach(id => {
          total += cart[id].qty * cart[id].price;
        });

        return actions.order.create({
          purchase_units: [{
            amount: {
              value: total.toFixed(2)
            },
            description: "Sleepy Hollows Invitational Golf Tournament Registration"
          }]
        });
      },

      onApprove: async function (data, actions) {
        container.style.display = 'none';
        const statusDiv = document.createElement('div');
        statusDiv.id = 'paypal-processing-status';
        statusDiv.innerHTML = `
          <div style="text-align: center; color: var(--color-accent); font-weight: 600; padding: var(--space-sm) 0;">
            <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>
            Finalizing registration and database records...
          </div>
        `;
        container.parentNode.insertBefore(statusDiv, container);

        try {
          const details = await actions.order.capture();
          const transactionId = details.id;

          let registrationReference = transactionId;
          if (supabase) {
            // Write to Supabase database
            registrationReference = await saveToSupabase(details);
          } else {
            console.log("Mocking database log. Reference ID:", transactionId);
          }

          if (document.getElementById('paypal-processing-status')) {
            document.getElementById('paypal-processing-status').remove();
          }
          container.style.display = 'block';
          // Show printable receipt modal
          showReceipt(registrationReference, details);
        } catch (error) {
          if (document.getElementById('paypal-processing-status')) {
            document.getElementById('paypal-processing-status').remove();
          }
          container.style.display = 'block';
          console.error("Checkout transaction or DB storage failed:", error);
          container.innerHTML = `
            <div style="text-align: center; color: #ff4757; padding: var(--space-md); border: 1px solid rgba(255, 71, 87, 0.5); border-radius: var(--border-radius-sm); margin-bottom: var(--space-md); background: rgba(255, 71, 87, 0.1);">
              <i class="fa-solid fa-triangle-exclamation" style="margin-bottom: 8px; font-size: 1.5rem;"></i><br>
              <strong>Error:</strong> ${error.message || "Transaction or DB storage failed."}<br>
              <p style="font-size: 0.85rem; margin-top: 5px; color: var(--color-text-secondary);">If payment succeeded but registration failed, contact the studio at (703) 887-6509.</p>
              <button class="btn btn-secondary btn-sm" id="btn-retry-paypal" style="margin-top: 10px;">Retry</button>
            </div>
          `;
          document.getElementById("btn-retry-paypal").addEventListener("click", (e) => {
            e.preventDefault();
            renderPayPalButtons();
          });
        }
      },

      onError: function (err) {
        if (document.getElementById('paypal-processing-status')) {
          document.getElementById('paypal-processing-status').remove();
        }
        container.style.display = 'block';
        console.error("PayPal Button error execution:", err);
        container.innerHTML = `
          <div style="text-align: center; color: #ff4757; padding: var(--space-md); border: 1px solid rgba(255, 71, 87, 0.5); border-radius: var(--border-radius-sm); margin-bottom: var(--space-md); background: rgba(255, 71, 87, 0.1);">
            <i class="fa-solid fa-triangle-exclamation" style="margin-bottom: 8px; font-size: 1.5rem;"></i><br>
            <strong>PayPal Error:</strong> ${err.message || "An error occurred during checkout."}<br>
            <button class="btn btn-secondary btn-sm" id="btn-retry-paypal-err" style="margin-top: 10px;">Retry</button>
          </div>
        `;
        document.getElementById("btn-retry-paypal-err").addEventListener("click", (e) => {
          e.preventDefault();
          renderPayPalButtons();
        });
      }
    }).render("#paypal-button-container");
  }

  // Save registration items and players to database
  async function saveToSupabase(paypalDetails) {
    const contactName = document.getElementById("reg-name").value;
    const contactEmail = document.getElementById("reg-email").value;
    const contactPhone = document.getElementById("reg-phone").value;

    let total = 0;
    Object.keys(cart).forEach(id => {
      total += cart[id].qty * cart[id].price;
    });

    // 1. Insert registrations
    const { data: reg, error: regErr } = await supabase
      .from("golf_registrations")
      .insert([{
        contact_name: contactName,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        total_amount: total,
        payment_reference: paypalDetails.id,
        payment_status: "paid"
      }])
      .select();

    if (regErr) throw regErr;
    const regId = reg[0].id;

    // 2. Insert items
    const items = [];
    Object.keys(cart).forEach(id => {
      const item = cart[id];
      if (item.qty > 0) {
        items.push({
          registration_id: regId,
          package_id: id,
          package_title: item.title,
          quantity: item.qty,
          price_per_item: item.price
        });
      }
    });

    const { error: itemsErr } = await supabase
      .from("golf_registration_items")
      .insert(items);

    if (itemsErr) throw itemsErr;

    // 3. Insert players
    const playerCards = playersWrapper.querySelectorAll(".player-entry-card");
    if (playerCards.length > 0) {
      const players = [];
      playerCards.forEach((card, idx) => {
        const name = card.querySelector(`input[name="player_${idx + 1}_name"]`).value;
        const email = card.querySelector(`input[name="player_${idx + 1}_email"]`).value;
        const handicap = card.querySelector(`select[name="player_${idx + 1}_handicap"]`).value;

        players.push({
          registration_id: regId,
          player_number: idx + 1,
          full_name: name,
          email: email,
          handicap: handicap
        });
      });

      const { error: playersErr } = await supabase
        .from("golf_players")
        .insert(players);

      if (playersErr) throw playersErr;
    }

    return regId;
  }

  // Populate ticket rows details
  ticketRows.forEach(row => {
    const id = row.getAttribute("data-id");
    const price = parseFloat(row.getAttribute("data-price"));
    const maxPlayersPerTicket = parseInt(row.getAttribute("data-players"));
    const title = row.querySelector(".ticket-title").textContent;

    const qtyValInput = row.querySelector(".qty-val");
    const decBtn = row.querySelector(".dec-qty");
    const incBtn = row.querySelector(".inc-qty");

    cart[id] = {
      title: title,
      price: price,
      playersPerTicket: maxPlayersPerTicket,
      qty: 0
    };

    decBtn.addEventListener("click", () => {
      if (cart[id].qty > 0) {
        cart[id].qty--;
        qtyValInput.value = cart[id].qty;
        updateCheckoutFlow();
      }
    });

    incBtn.addEventListener("click", () => {
      if (cart[id].qty < 10) {
        cart[id].qty++;
        qtyValInput.value = cart[id].qty;
        updateCheckoutFlow();
      }
    });
  });

  function updateCheckoutFlow() {
    let total = 0;
    let totalQty = 0;
    let totalPlayers = 0;

    cartItemsBody.innerHTML = "";

    Object.keys(cart).forEach(id => {
      const item = cart[id];
      if (item.qty > 0) {
        totalQty += item.qty;
        const subtotal = item.qty * item.price;
        total += subtotal;
        totalPlayers += item.qty * item.playersPerTicket;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${item.title}</td>
          <td style="text-align: right;">${item.qty}</td>
          <td style="text-align: right;">$${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
        cartItemsBody.appendChild(tr);
      }
    });

    cartTotalVal.textContent = `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (totalQty > 0) {
      checkoutFlow.style.display = "block";
      generatePlayerInputs(totalPlayers);
    } else {
      checkoutFlow.style.display = "none";
      playersWrapper.innerHTML = "";
    }
  }

  function generatePlayerInputs(playerCount) {
    if (playerCount === 0) {
      playersWrapper.innerHTML = "";
      document.dispatchEvent(new Event("playerFormUpdated"));
      return;
    }

    const existingPlayersData = [];
    const playerInputs = playersWrapper.querySelectorAll(".player-entry-card");
    playerInputs.forEach((card, index) => {
      const nameInput = card.querySelector(`input[name="player_${index + 1}_name"]`);
      const emailInput = card.querySelector(`input[name="player_${index + 1}_email"]`);
      const handicapInput = card.querySelector(`select[name="player_${index + 1}_handicap"]`);

      existingPlayersData.push({
        name: nameInput ? nameInput.value : "",
        email: emailInput ? emailInput.value : "",
        handicap: handicapInput ? handicapInput.value : "Scratch"
      });
    });

    playersWrapper.innerHTML = `<h4 class="uppercase mb-sm" style="font-size: 0.9rem; color: var(--color-text-secondary); margin-top: var(--space-md);">Player Information</h4>`;

    for (let i = 0; i < playerCount; i++) {
      const existing = existingPlayersData[i] || { name: "", email: "", handicap: "Scratch" };
      const card = document.createElement("div");
      card.className = "player-entry-card";
      card.innerHTML = `
        <div class="player-entry-title">Player ${i + 1}</div>
        <div class="grid grid-3">
          <div class="form-group mb-0">
            <label class="form-label" style="font-size: 0.75rem;">Full Name</label>
            <input class="form-input" type="text" name="player_${i + 1}_name" required value="${existing.name}" placeholder="Player ${i + 1} Name">
          </div>
          <div class="form-group mb-0">
            <label class="form-label" style="font-size: 0.75rem;">Email Address</label>
            <input class="form-input" type="email" name="player_${i + 1}_email" value="${existing.email}" placeholder="player${i + 1}@example.com">
          </div>
          <div class="form-group mb-0">
            <label class="form-label" style="font-size: 0.75rem;">Handicap</label>
            <select class="form-input" name="player_${i + 1}_handicap" style="padding-top: 10px; padding-bottom: 10px;">
              <option value="Scratch" ${existing.handicap === "Scratch" ? "selected" : ""}>Scratch</option>
              <option value="1-5" ${existing.handicap === "1-5" ? "selected" : ""}>1 - 5</option>
              <option value="6-10" ${existing.handicap === "6-10" ? "selected" : ""}>6 - 10</option>
              <option value="11-15" ${existing.handicap === "11-15" ? "selected" : ""}>11 - 15</option>
              <option value="16-20" ${existing.handicap === "16-20" ? "selected" : ""}>16 - 20</option>
              <option value="21-28" ${existing.handicap === "21-28" ? "selected" : ""}>21 - 28</option>
              <option value="29+" ${existing.handicap === "29+" ? "selected" : ""}>29+</option>
            </select>
          </div>
        </div>
      `;
      playersWrapper.appendChild(card);
    }

    // Trigger forms validation checks
    document.dispatchEvent(new Event("playerFormUpdated"));
  }

  function showReceipt(referenceId, paypalDetails) {
    receiptIdVal.textContent = referenceId.length > 20 ? `#${referenceId.substring(0, 12)}...` : `#${referenceId}`;

    let totalPaid = 0;
    receiptItemsList.innerHTML = "";
    Object.keys(cart).forEach(id => {
      const item = cart[id];
      if (item.qty > 0) {
        const subtotal = item.qty * item.price;
        totalPaid += subtotal;

        const div = document.createElement("div");
        div.className = "receipt-line";
        div.innerHTML = `
          <span>${item.title} (x${item.qty})</span>
          <span>$${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        `;
        receiptItemsList.appendChild(div);
      }
    });

    receiptTotalVal.textContent = `$${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    receiptPlayersList.innerHTML = "";
    const playerInputs = playersWrapper.querySelectorAll(".player-entry-card");
    if (playerInputs.length > 0) {
      playerInputs.forEach((card, idx) => {
        const name = card.querySelector(`input[name="player_${idx + 1}_name"]`).value;
        const handicap = card.querySelector(`select[name="player_${idx + 1}_handicap"]`).value;
        const li = document.createElement("li");
        li.innerHTML = `<strong>${name}</strong> (Handicap: ${handicap})`;
        receiptPlayersList.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.textContent = "No players registered (Sponsorship package only).";
      receiptPlayersList.appendChild(li);
    }

    receiptModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  // Close receipt and reset page
  btnCloseReceipt.addEventListener("click", () => {
    receiptModal.style.display = "none";
    document.body.style.overflow = "";

    regForm.reset();

    Object.keys(cart).forEach(id => {
      cart[id].qty = 0;
    });

    document.querySelectorAll(".qty-val").forEach(input => {
      input.value = "0";
    });

    updateCheckoutFlow();
    renderPayPalButtons(); // Reset button callbacks
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});
