document.addEventListener("DOMContentLoaded", () => {

  const DOCTORS = [
    { name: "Dr. Adams", specialty: "Cardiologist", slots: ["10:00 tomorrow", "15:00 tomorrow", "10:00 next Monday"] },
    { name: "Dr. Baker", specialty: "General Practitioner", slots: ["11:00 tomorrow", "16:00 tomorrow", "09:00 Friday"] },
    { name: "Dr. Chen", specialty: "Pulmonologist", slots: ["09:30 tomorrow", "14:30 tomorrow", "11:00 Saturday"] },
    { name: "Dr. Davis", specialty: "Dermatologist", slots: ["13:00 tomorrow", "17:00 Friday", "09:00 next Tuesday"] },
    { name: "Dr. Evans", specialty: "Neurologist", slots: ["10:30 tomorrow", "15:30 Monday", "14:00 Wednesday"] },
    { name: "Dr. Flores", specialty: "Gastroenterologist", slots: ["12:00 tomorrow", "18:00 tomorrow", "10:00 next Thursday"] },
  ];

  const basePrompt = `You are an AI healthcare assistant. Ask the user up to 3 short follow-up questions to better understand their symptoms. When confident, recommend the best doctor from the provided list and include available slots. Respond ONLY in JSON like {"question":"string"} while gathering info or {"doctor":"Dr. Name","specialty":"specialty","slots":["time1","time2"...]}. Available doctors: ${DOCTORS.map(d => `${d.name} - ${d.specialty} times: ${d.slots.join(" ")}`).join("; ")}`;

  let conversation = [{ role: "system", content: basePrompt }];
  const chatMessages = document.getElementById("chat-messages");
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  const imageInput = document.getElementById("image-input");
  const clearChatButton = document.getElementById("clear-chat");
  const optionsContainer = document.getElementById("options-container");
  const summary = document.getElementById("booking-summary");
  const appointmentTemplate = document.getElementById("appointment-options-template");

  const DEFAULT_PLACEHOLDER = userInput.placeholder;

  const state = {
    awaitingConsent: true,
    awaitingName: false,
    awaitingImage: false,
    waitingForSymptoms: false,
    waitingForSlot: false,
    selectedDoctor: null,
    selectedSlot: null,
    selectedClinic: null,
    awaitingLocation: false,
    awaitingZip: false,
    awaitingClinic: false,
    awaitingDoctor: false,
    awaitingInsurance: false,
    awaitingInsuranceOther: false,
    awaitingPolicy: false,
    aiQuestions: 0,
    name: "",
    lastSymptom: "",
    userLocation: "",
    selectedInsurance: "",
    policyNumber: "",
    clarifying: false,
    clarifyIndex: 0,
    clarifyAnswers: [],
    awaitingCoverageConfirm: false,
    awaitingPayment: false,
    awaitingContact: false,
    priceEstimate: "",
  };

  const bookings = [];

  const CLARIFY_QUESTIONS = [
    "How long have you had this issue?",
    "Does it itch or cause pain?",
    "Have you noticed any triggers or tried treatments?",
  ];

  function addUserMessage(message) {
    const el = document.createElement("div");
    el.className = "message user";
    el.innerHTML = `<div class="message-content">${message}</div>`;
    chatMessages.appendChild(el);
    scrollToBottom();
  }

  function addUserImage(src) {
    const el = document.createElement("div");
    el.className = "message user";
    const content = document.createElement("div");
    content.className = "message-content";
    const img = document.createElement("img");
    img.src = src;
    img.alt = "uploaded photo";
    img.style.maxWidth = "160px";
    content.appendChild(img);
    el.appendChild(content);
    chatMessages.appendChild(el);
    scrollToBottom();
  }

  function addBotMessage(message) {
    const el = document.createElement("div");
    el.className = "message bot";
    el.innerHTML = `<div class="message-content">${message}</div>`;
    chatMessages.appendChild(el);
    scrollToBottom();
    return el;
  }

  function showAnalyzing() {
    const el = document.createElement("div");
    el.className = "message bot";
    const content = document.createElement("div");
    content.className = "message-content";
    content.textContent = "Analyzing";
    el.appendChild(content);
    chatMessages.appendChild(el);
    scrollToBottom();
    let dots = 0;
    const interval = setInterval(() => {
      dots = (dots + 1) % 4;
      content.textContent = "Analyzing" + ".".repeat(dots);
    }, 500);
    return () => {
      clearInterval(interval);
      el.remove();
    };
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function updateSummary() {
    summary.innerHTML = "<h3>Your Appointments</h3>";
    const div = document.createElement("div");
    div.className = "summary-content";
    if (bookings.length) {
      bookings.forEach((b) => {
        const p = document.createElement("p");
        const clinicText = b.clinic ? ` at ${b.clinic.name}` : "";
        const insText = b.insurance ? ` with ${b.insurance}` : "";
        p.innerHTML = `<strong>${b.doctor.name}</strong> (${b.doctor.specialty})${clinicText} - ${b.slot}${insText}`;
        div.appendChild(p);
      });
    } else {
      div.innerHTML = "<p>No appointment yet</p>";
    }
    summary.appendChild(div);
  }

  function showConsentPrompt() {
    addBotMessage(
      "\uD83D\uDC4B Welcome to HealthCo Clinics!<br>We\u2019ll use the info you share to find the best care for you.<br>Do you consent to proceeding under our privacy policy?"
    );
    document.querySelectorAll('.button-row').forEach((el) => el.remove());
    const wrapper = document.createElement("div");
    wrapper.className = "button-row";
    const yes = document.createElement("button");
    yes.className = "consent-button";
    yes.textContent = "Yes \u2705";
    const no = document.createElement("button");
    no.className = "consent-button";
    no.textContent = "No \u274C";
    wrapper.appendChild(yes);
    wrapper.appendChild(no);
    chatMessages.appendChild(wrapper);
    scrollToBottom();

    yes.addEventListener("click", () => {
      wrapper.remove();
      state.awaitingConsent = false;
      state.awaitingName = true;
      setTimeout(() => {
        addBotMessage("Great! What's your name?");
      }, 100);
    });

    no.addEventListener("click", () => {
      wrapper.remove();
      state.awaitingConsent = false;
      addBotMessage("No worries. If you change your mind, just type start.");
    });
  }

  function showImagePrompt() {
    addBotMessage("Could you snap a clear photo of the affected area?");
    document.querySelectorAll('.button-row').forEach((el) => el.remove());
    const row = document.createElement('div');
    row.className = 'button-row';
    const cam = document.createElement('button');
    cam.className = 'consent-button camera-button';
    cam.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l2-3h8l2 3h3a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>`;
    const skip = document.createElement('button');
    skip.className = 'consent-button';
    skip.textContent = 'Skip';
    row.appendChild(cam);
    row.appendChild(skip);
    chatMessages.appendChild(row);
    scrollToBottom();
    imagePromptRow = row;

    cam.addEventListener('click', () => {
      imageInput.click();
    });

    skip.addEventListener('click', () => {
      row.remove();
      imagePromptRow = null;
      addUserMessage('Skip');
      state.awaitingImage = false;
      state.clarifying = true;
      state.clarifyIndex = 0;
      state.clarifyAnswers = [];
      askNextClarifyQuestion();
    });
  }

  function askNextClarifyQuestion() {
    if (state.clarifyIndex < CLARIFY_QUESTIONS.length) {
      const q = CLARIFY_QUESTIONS[state.clarifyIndex];
      state.clarifyIndex++;
      addBotMessage(q);
    } else {
      finalizeClarification();
    }
  }

  async function finalizeClarification() {
    state.clarifying = false;
    try {
      const diag = await getDiagnosisFromClarifications(
        state.lastSymptom,
        state.clarifyAnswers
      );
      const derm = DOCTORS.find((d) => d.specialty === 'Dermatologist');
      state.selectedDoctor = derm;
      state.waitingForSymptoms = false;
      addBotMessage(
        `Looks like ${diag} \u2014 but a dermatologist will give the final word. Let\u2019s book you in!`
      );
      askForLocation();
    } catch (err) {
      console.error(err);
      const derm = DOCTORS.find((d) => d.specialty === 'Dermatologist');
      state.selectedDoctor = derm;
      state.waitingForSymptoms = false;
      addBotMessage(
        "A dermatologist will give the final word. Let’s book you in!"
      );
      askForLocation();
    }
  }

  async function getDiagnosisFromClarifications(symptom, answers) {
    const text = `Symptom: ${symptom}. Answers: ${answers
      .map((a, i) => `Q${i + 1}: ${CLARIFY_QUESTIONS[i]} A: ${a}`)
      .join(' ')}`;
    const messages = [
      {
        role: 'user',
        content:
          text +
          ' Based on this, what is the most likely skin diagnosis? Respond with JSON {"diagnosis":"text"}.',
      },
    ];
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-3.5-turbo', messages }),
    });
    const data = await response.json();
    if (response.ok) {
      let content = data.choices?.[0]?.message?.content?.trim();
      if (content) {
        content = content.replace(/```json|```/g, '').trim();
        try {
          const parsed = JSON.parse(content);
          if (parsed.diagnosis) return parsed.diagnosis;
        } catch {
          return content.split(/\n/)[0];
        }
      }
    }
    throw new Error('diagnosis fetch failed');
  }

  function clearChat() {
    chatMessages.innerHTML = "";
    optionsContainer.innerHTML = "";
    optionsContainer.classList.remove("active");
    state.awaitingConsent = true;
    state.awaitingName = false;
    state.awaitingImage = false;
    state.waitingForSymptoms = false;
    state.waitingForSlot = false;
    state.awaitingLocation = false;
    state.awaitingZip = false;
    state.awaitingClinic = false;
    state.awaitingInsurance = false;
    state.awaitingInsuranceOther = false;
    state.selectedDoctor = null;
    state.selectedSlot = null;
    state.selectedClinic = null;
    state.selectedInsurance = '';
    state.userLocation = '';
    state.aiQuestions = 0;
    state.name = "";
    state.lastSymptom = "";
    state.clarifying = false;
    state.clarifyIndex = 0;
    state.clarifyAnswers = [];
    conversation = [{ role: "system", content: basePrompt }];
    updateSummary();
    setTimeout(() => {
      showConsentPrompt();
    }, 100);
  }

  async function getRecommendation(text) {
    conversation.push({ role: "user", content: text });
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "gpt-3.5-turbo", messages: conversation }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "API request failed");
    }
    const reply = data.choices[0].message.content.trim();
    conversation.push({ role: "assistant", content: reply });
    try {
      return JSON.parse(reply);
    } catch {
      throw new Error("Failed to parse AI response: " + reply);
    }
  }

  async function checkNeedPhoto(text) {
    const messages = [
      {
        role: "user",
        content:
          `A patient says: ${text}. Do these symptoms require a photo for better assessment? Reply ONLY with JSON {"photo":true|false}.`,
      },
    ];
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-3.5-turbo", messages }),
      });
      const data = await response.json();
      if (response.ok) {
        let content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          content = content.replace(/```json|```/g, "").trim();
          try {
            const parsed = JSON.parse(content);
            return !!parsed.photo;
          } catch {}
        }
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  }

  function askForLocation() {
    document.querySelectorAll('.button-row').forEach((el) => el.remove());
    const msg = addBotMessage(
      'May I use your device location to find the nearest clinic?<br>(If you\u2019d rather type your ZIP/postcode, please enter it below.)'
    );
    const row = document.createElement('div');
    row.className = 'button-row';
    const share = document.createElement('button');
    share.className = 'consent-button';
    share.textContent = 'Share Location \uD83D\uDCCD';
    row.appendChild(share);
    chatMessages.appendChild(row);
    scrollToBottom();
    state.awaitingLocation = true;

    share.addEventListener('click', () => {
      row.remove();
      msg.remove();
      state.awaitingLocation = false;
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = `${pos.coords.latitude.toFixed(3)},${pos.coords.longitude.toFixed(3)}`;
          state.userLocation = loc;
          const stop = showAnalyzing();
          await fetchClinics(loc);
          stop();
        },
        () => {
          addBotMessage("Couldn't get your location. Please type your ZIP/postcode.");
          state.awaitingZip = true;
        }
      );
    });

  }

  async function fetchClinics(locationText) {
    const messages = [
      {
        role: 'user',
        content:
          `Generate 3 fictional clinic options near ${locationText} with distance in km, address, rating out of 5, and days until a ${state.selectedDoctor.specialty} is available. Respond ONLY with JSON [{"name":"","distance":0,"address":"","rating":0,"days":0}]`,
      },
    ];
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-3.5-turbo', messages }),
      });
      const data = await response.json();
      let clinics = [];
      if (response.ok) {
        let content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          content = content.replace(/```json|```/g, '').trim();
          try {
            clinics = JSON.parse(content);
          } catch {}
        }
      }
      if (!Array.isArray(clinics) || !clinics.length) {
        clinics = [
          { name: 'HealthCo Central', distance: 2, address: '1 Main St', rating: 4.6, days: 2 },
          { name: 'Downtown Clinic', distance: 5, address: '55 Oak Ave', rating: 4.4, days: 3 },
          { name: 'Riverside Health', distance: 7, address: '200 River Rd', rating: 4.2, days: 4 },
        ];
      }
      showClinicOptions(clinics);
    } catch (err) {
      console.error(err);
      showClinicOptions([
        { name: 'HealthCo Central', distance: 2, address: '1 Main St', rating: 4.6, days: 2 },
        { name: 'Downtown Clinic', distance: 5, address: '55 Oak Ave', rating: 4.4, days: 3 },
        { name: 'Riverside Health', distance: 7, address: '200 River Rd', rating: 4.2, days: 4 },
      ]);
    }
  }

  function pluralSpecialty(spec) {
    return spec.endsWith('s') ? spec : spec + 's';
  }

  async function fetchInsuranceOptions(locationText) {
    const messages = [
      {
        role: 'user',
        content: `List up to 5 popular health insurance providers in ${locationText}. Respond ONLY with JSON ["A","B"]`,
      },
    ];
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-3.5-turbo', messages }),
      });
      const data = await response.json();
      let opts = [];
      if (response.ok) {
        let content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          content = content.replace(/```json|```/g, '').trim();
          try {
            opts = JSON.parse(content);
          } catch {}
        }
      }
      if (!Array.isArray(opts) || !opts.length) {
        opts = ['Insurance A', 'Insurance B', 'Insurance C'];
      }
      return opts.slice(0, 5);
    } catch (err) {
      console.error(err);
      return ['Insurance A', 'Insurance B', 'Insurance C'];
    }
  }

  let clinicMessage = null;
  let doctorMessage = null;
  let insuranceMessage = null;
  let paymentMessage = null;
  let contactMessage = null;
  let clinicsData = [];
  let insuranceOptions = [];
  let expandedDoctorCard = null;
  let imagePromptRow = null;

  function showClinicOptions(clinics) {
    clinicsData = clinics;
    if (clinicMessage) clinicMessage.remove();
    const message = document.createElement('div');
    message.className = 'message bot';
    const content = document.createElement('div');
    content.className = 'message-content';
    const intro = document.createElement('p');
    intro.textContent = 'Here are three options:';
    const container = document.createElement('div');
    container.className = 'clinic-options';

    clinics.forEach((c) => {
      const card = document.createElement('div');
      card.className = 'option-card clinic-card';
      card.innerHTML =
        `<div><strong>${c.name}</strong> ${c.rating}⭐ – ${c.distance} km away</div>` +
        `<div class="clinic-address">${c.address}</div>` +
        `<div>${pluralSpecialty(state.selectedDoctor.specialty)} available in ${c.days} days</div>`;
      const btn = document.createElement('button');
      btn.className = 'glass-button select-clinic';
      btn.textContent = 'Book Appointment';
      btn.addEventListener('click', () => selectClinic(c));
      card.appendChild(btn);
      container.appendChild(card);
    });

    content.appendChild(intro);
    content.appendChild(container);
    message.appendChild(content);
    chatMessages.appendChild(message);
    scrollToBottom();
    state.awaitingClinic = true;
    clinicMessage = message;
  }

  function selectClinic(clinic) {
    state.selectedClinic = clinic;
    state.awaitingClinic = false;
    optionsContainer.classList.remove('active');
    if (clinicMessage) { clinicMessage.remove(); clinicMessage = null; }
    fetchDoctors(clinic);
  }

  async function fetchDoctors(clinic) {
    const spec = state.selectedDoctor.specialty;
    const messages = [
      {
        role: 'user',
        content:
          `Generate 4 fictional ${spec}s working at ${clinic.name}. Return JSON ` +
          `[{"name":"","desc":"","rating":0,"languages":[""],"slots":["time1","time2"]}] with at least 3 slots each.`,
      },
    ];
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-3.5-turbo', messages }),
      });
      const data = await response.json();
      let docs = [];
      if (response.ok) {
        let content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          content = content.replace(/```json|```/g, '').trim();
          try {
            docs = JSON.parse(content);
          } catch {}
        }
      }
      if (!Array.isArray(docs) || !docs.length) {
        docs = DOCTORS.filter((d) => d.specialty === spec).map((d) => ({
          name: d.name,
          desc: `${spec} with 5 years experience`,
          rating: (4 + Math.random()).toFixed(1),
          languages: ['English'],
          slots: d.slots,
          specialty: spec,
        })).slice(0, 4);
      }
      docs = docs.map((d) => ({ ...d, specialty: spec }));
      showDoctorOptions(docs);
  } catch (err) {
    console.error(err);
    const docs = DOCTORS.filter((d) => d.specialty === spec).map((d) => ({
      name: d.name,
      desc: `${spec} with 5 years experience`,
      rating: (4 + Math.random()).toFixed(1),
      languages: ['English'],
      slots: d.slots,
      specialty: spec,
    })).slice(0, 4);
    showDoctorOptions(docs);
  }
}

  function showDoctorOptions(doctors) {
    if (doctorMessage) doctorMessage.remove();
    if (paymentMessage) paymentMessage.remove();
    const msg = document.createElement('div');
    msg.className = 'message bot';
    const content = document.createElement('div');
    content.className = 'message-content';
    const intro = document.createElement('p');
    intro.textContent = `Doctors at ${state.selectedClinic.name}:`;
    const container = document.createElement('div');
    container.className = 'doctor-options';

    doctors.forEach((d) => {
      const card = document.createElement('div');
      card.className = 'option-card doctor-card';
      card.__doc = d;
      card.innerHTML =
        `<div><strong>${d.name}</strong> ${d.rating}⭐</div>` +
        `<div class="doctor-desc">${d.desc}</div>` +
        `<div class="doctor-lang">Languages: ${d.languages.join(', ')}</div>`;
      const btn = document.createElement('button');
      btn.className = 'glass-button select-doctor';
      btn.textContent = 'Select';
      btn.addEventListener('click', () => expandDoctorCard(card, d));
      card.appendChild(btn);
      container.appendChild(card);
    });

    const back = document.createElement('button');
    back.className = 'back-button';
    back.textContent = '←';
    back.addEventListener('click', () => {
      msg.remove();
      state.awaitingDoctor = false;
      showClinicOptions(clinicsData);
    });

    content.appendChild(back);
    content.appendChild(intro);
    content.appendChild(container);
    msg.appendChild(content);
    chatMessages.appendChild(msg);
    scrollToBottom();
    state.awaitingDoctor = true;
    doctorMessage = msg;
  }

  function expandDoctorCard(card, doc) {
    if (expandedDoctorCard && expandedDoctorCard !== card) {
      collapseDoctorCard(expandedDoctorCard, expandedDoctorCard.__doc);
    }
    state.selectedDoctor = doc;
    state.awaitingDoctor = false;
    const selectBtn = card.querySelector('.select-doctor');
    if (selectBtn) selectBtn.remove();
    const slotsDiv = document.createElement('div');
    slotsDiv.className = 'slot-options';
    doc.slots.forEach((time) => {
      const row = document.createElement('div');
      row.className = 'slot-row';
      const span = document.createElement('span');
      span.textContent = time;
      const book = document.createElement('button');
      book.className = 'glass-button book-slot';
      book.textContent = 'Book';
      book.addEventListener('click', () => selectSlot(time, doc));
      row.appendChild(span);
      row.appendChild(book);
      slotsDiv.appendChild(row);
    });
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-card';
    closeBtn.textContent = '✖';
    closeBtn.addEventListener('click', () => collapseDoctorCard(card, doc));
    card.prepend(closeBtn);
    card.appendChild(slotsDiv);
    expandedDoctorCard = card;
  }

  function collapseDoctorCard(card, doc) {
    if (!doc) doc = card.__doc;
    const slots = card.querySelector('.slot-options');
    if (slots) slots.remove();
    const close = card.querySelector('.close-card');
    if (close) close.remove();
    if (!card.querySelector('.select-doctor')) {
      const btn = document.createElement('button');
      btn.className = 'glass-button select-doctor';
      btn.textContent = 'Select';
      btn.addEventListener('click', () => expandDoctorCard(card, doc));
      card.appendChild(btn);
    }
    if (expandedDoctorCard === card) expandedDoctorCard = null;
  }

  async function askForInsurance() {
    document.querySelectorAll('.button-row').forEach((el) => el.remove());
    insuranceOptions = await fetchInsuranceOptions(state.userLocation || '');
    if (insuranceMessage) insuranceMessage.remove();
    insuranceMessage = addBotMessage(
      `Which insurance will you use? Popular choices here: ${insuranceOptions.slice(0, 3).join(', ')}. Or Other.`
    );
    showInsuranceOptions();
  }

  function showInsuranceOptions() {
    const row = document.createElement('div');
    row.className = 'button-row';
    insuranceOptions.forEach((ins) => {
      const btn = document.createElement('button');
      btn.className = 'consent-button';
      btn.textContent = ins;
      btn.addEventListener('click', () => {
        row.remove();
        selectInsurance(ins);
      });
      row.appendChild(btn);
    });
    const other = document.createElement('button');
    other.className = 'consent-button';
    other.textContent = 'Other';
    other.addEventListener('click', () => {
      row.remove();
      if (insuranceMessage) { insuranceMessage.remove(); insuranceMessage = null; }
      state.awaitingInsurance = false;
      state.awaitingInsuranceOther = true;
      addBotMessage('Please type your insurer name.');
    });
    row.appendChild(other);
    chatMessages.appendChild(row);
    scrollToBottom();
    state.awaitingInsurance = true;
  }

  function showPolicyNumberPrompt() {
    if (insuranceMessage) { insuranceMessage.remove(); insuranceMessage = null; }
    addBotMessage('Please enter your policy number.');
    userInput.placeholder = 'Policy number';
    state.awaitingPolicy = true;
  }

  function showCheckingCoverage() {
    const el = document.createElement('div');
    el.className = 'message bot';
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = 'Checking coverage';
    el.appendChild(content);
    chatMessages.appendChild(el);
    scrollToBottom();
    let dots = 0;
    const interval = setInterval(() => {
      dots = (dots + 1) % 4;
      content.textContent = 'Checking coverage' + '.'.repeat(dots);
    }, 500);
    return () => {
      clearInterval(interval);
      el.remove();
    };
  }

  async function fetchConsultationPrice(loc, insurance) {
    const messages = [
      {
        role: 'user',
        content: `In ${loc}, what is an approximate dermatologist consultation price with ${insurance} insurance? Respond ONLY with JSON {"price":"amount CUR"}`,
      },
    ];
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-3.5-turbo', messages }),
      });
      const data = await response.json();
      if (response.ok) {
        let content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          content = content.replace(/```json|```/g, '').trim();
          try {
            const parsed = JSON.parse(content);
            if (parsed.price) return parsed.price;
          } catch {}
        }
      }
    } catch (err) {
      console.error(err);
    }
    return '50 USD';
  }

  async function checkCoverage() {
    const stop = showCheckingCoverage();
    const price = await fetchConsultationPrice(state.userLocation || 'your area', state.selectedInsurance || 'your insurance');
    stop();
    state.priceEstimate = price;
    const msg = addBotMessage(`Your consultation is estimated at ${price} (${state.selectedInsurance} negotiated rate).<br><span class="subtle-text">This covers the visit only; treatment costs may vary.</span>`);
    const row = document.createElement('div');
    row.className = 'button-row';
    const confirm = document.createElement('button');
    confirm.className = 'consent-button';
    confirm.textContent = 'Confirm';
    row.appendChild(confirm);
    chatMessages.appendChild(row);
    scrollToBottom();
    state.awaitingCoverageConfirm = true;

    confirm.addEventListener('click', () => {
      row.remove();
      state.awaitingCoverageConfirm = false;
      showPaymentDetails();
    });
  }

  function selectInsurance(name) {
    state.selectedInsurance = name;
    state.awaitingInsurance = false;
    if (insuranceMessage) { insuranceMessage.remove(); insuranceMessage = null; }
    showPolicyNumberPrompt();
  }

  function showPaymentDetails() {
    const msg = document.createElement('div');
    msg.className = 'message bot';
    const content = document.createElement('div');
    content.className = 'message-content';
    const form = document.createElement('div');
    form.className = 'payment-form';
    form.innerHTML = `
      <div class="form-group">
        <label>Card Number</label>
        <input class="form-input" value="4111 1111 1111 1111">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Expiry</label>
          <input class="form-input" value="12/25">
        </div>
        <div class="form-group">
          <label>CVC</label>
          <input class="form-input" value="123">
        </div>
      </div>
    `;
    const actions = document.createElement('div');
    actions.className = 'payment-actions';
    const pay = document.createElement('button');
    pay.className = 'glass-button primary';
    pay.textContent = 'Pay';
    actions.appendChild(pay);
    form.appendChild(actions);
    content.appendChild(form);
    msg.appendChild(content);
    chatMessages.appendChild(msg);
    scrollToBottom();
    paymentMessage = msg;
    state.awaitingPayment = true;

    pay.addEventListener('click', () => {
      state.awaitingPayment = false;
      if (paymentMessage) { paymentMessage.remove(); paymentMessage = null; }
      showContactForm();
    });
  }

  function showContactForm() {
    const msg = document.createElement('div');
    msg.className = 'message bot';
    const content = document.createElement('div');
    content.className = 'message-content';
    const form = document.createElement('div');
    form.className = 'payment-form';
    form.innerHTML = `
      <div class="form-group">
        <label>Name</label>
        <input id="contact-name" class="form-input" value="${state.name}">
      </div>
      <div class="form-group">
        <label>Phone</label>
        <div class="form-row">
          <select id="contact-country" class="form-input" style="flex:0.5">
            <option value="+1">+1</option>
            <option value="+44">+44</option>
            <option value="+61">+61</option>
            <option value="+34">+34</option>
          </select>
          <input id="contact-phone" class="form-input" value="">
        </div>
      </div>
      <div class="form-group">
        <label>Email</label>
        <input id="contact-email" class="form-input" type="email">
      </div>
      <div class="form-group">
        <label><input type="checkbox" id="contact-ok" checked> Send updates to these contacts</label>
      </div>
    `;
    const actions = document.createElement('div');
    actions.className = 'payment-actions';
    const confirm = document.createElement('button');
    confirm.className = 'glass-button primary';
    confirm.textContent = 'Confirm';
    actions.appendChild(confirm);
    form.appendChild(actions);
    content.appendChild(form);
    msg.appendChild(content);
    chatMessages.appendChild(msg);
    scrollToBottom();
    contactMessage = msg;
    state.awaitingContact = true;

    confirm.addEventListener('click', () => {
      state.awaitingContact = false;
      if (contactMessage) { contactMessage.remove(); contactMessage = null; }
      finalizeBooking();
    });
  }

  function finalizeBooking() {
    bookings.push({
      doctor: state.selectedDoctor,
      clinic: state.selectedClinic,
      slot: state.selectedSlot,
      insurance: state.selectedInsurance,
    });
    addBotMessage(
      `Appointment with ${state.selectedDoctor.name} confirmed for ${state.selectedSlot}. You'll receive a reminder!`
    );
    updateSummary();
    state.waitingForSymptoms = true;
    state.selectedClinic = null;
    state.selectedDoctor = null;
    state.selectedSlot = null;
    state.selectedInsurance = '';
    state.policyNumber = '';
    state.priceEstimate = '';
    state.aiQuestions = 0;
    state.clarifying = false;
    state.clarifyIndex = 0;
    state.clarifyAnswers = [];
    state.awaitingCoverageConfirm = false;
    state.awaitingPayment = false;
    state.awaitingContact = false;
    conversation = [{ role: 'system', content: basePrompt }];
    userInput.placeholder = DEFAULT_PLACEHOLDER;
    setTimeout(() => {
      addBotMessage('Let me know if you want to make another booking.');
      showBookAgainPrompt();
    }, 100);
  }

  function showBookAgainPrompt() {
    document.querySelectorAll('.book-again-row').forEach((el) => el.remove());
    const row = document.createElement('div');
    row.className = 'button-row book-again-row';
    const btn = document.createElement('button');
    btn.className = 'consent-button';
    btn.textContent = 'Book new appointment';
    row.appendChild(btn);
    chatMessages.appendChild(row);
    scrollToBottom();
    btn.addEventListener('click', () => {
      row.remove();
      addBotMessage(`Hello ${state.name || ''}. What symptoms are you experiencing?`);
      state.waitingForSymptoms = true;
    });
  }

  // legacy doctor selection flow kept for reference

  function selectSlot(time, doctor) {
    state.selectedDoctor = doctor;
    state.selectedSlot = time;
    state.waitingForSlot = false;
    if (doctorMessage) {
      doctorMessage.remove();
      doctorMessage = null;
    }
    askForInsurance();
  }

  async function handleUserMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    addUserMessage(message);
    userInput.value = "";

    if (message.toLowerCase() === "start") {
      state.awaitingConsent = true;
      state.awaitingName = false;
      state.awaitingImage = false;
      state.waitingForSymptoms = false;
      showConsentPrompt();
      return;
    }

    if (state.awaitingConsent) {
      addBotMessage("Please use the buttons below to continue.");
      return;
    }

    if (state.awaitingLocation) {
      state.awaitingLocation = false;
      if (message.toLowerCase() === 'skip') {
        state.awaitingZip = true;
        addBotMessage('Please type your ZIP/postcode.');
      } else {
        state.userLocation = message;
        fetchClinics(message);
      }
      return;
    }

    if (state.awaitingZip) {
      state.awaitingZip = false;
      state.userLocation = message;
      fetchClinics(message);
      return;
    }

    if (state.awaitingClinic) {
      addBotMessage('Please choose one of the clinic options below.');
      return;
    }

    if (state.awaitingDoctor) {
      addBotMessage('Please select one of the doctors below.');
      return;
    }

    if (state.awaitingInsurance) {
      addBotMessage('Please choose one of the insurance options below.');
      return;
    }

    if (state.awaitingPolicy) {
      state.policyNumber = message;
      state.awaitingPolicy = false;
      userInput.placeholder = DEFAULT_PLACEHOLDER;
      checkCoverage();
      return;
    }

    if (state.awaitingCoverageConfirm) {
      addBotMessage('Please use the Confirm button below.');
      return;
    }

    if (state.awaitingPayment) {
      addBotMessage('Please use the Pay button below.');
      return;
    }

    if (state.awaitingContact) {
      addBotMessage('Please fill the form and press Confirm.');
      return;
    }

    if (state.awaitingInsuranceOther) {
      state.selectedInsurance = message;
      state.awaitingInsuranceOther = false;
      showPolicyNumberPrompt();
      return;
    }

    if (state.awaitingName) {
      state.name = message;
      state.awaitingName = false;
      state.waitingForSymptoms = true;
      addBotMessage(`Hello ${state.name}. What symptoms are you experiencing?`);
      return;
    }

    if (state.awaitingImage) {
      addBotMessage("Please use the buttons below to upload a photo or skip.");
      return;
    }

    if (state.clarifying) {
      state.clarifyAnswers.push(message);
      askNextClarifyQuestion();
      return;
    }

      if (state.waitingForSymptoms) {
        state.lastSymptom = message;
        const dermWords = ["rash", "acne", "mole", "wound", "swelling", "cough"];
        let needsPhoto = false;
        try {
          needsPhoto = await checkNeedPhoto(message);
        } catch {}
        if (needsPhoto || dermWords.some((w) => message.toLowerCase().includes(w))) {
          state.awaitingImage = true;
          showImagePrompt();
          return;
        }
      try {
        const result = await getRecommendation(message);
        if (result.question && state.aiQuestions < 3) {
          state.aiQuestions++;
          addBotMessage(result.question);
        } else if (result.doctor) {
          state.selectedDoctor = DOCTORS.find((d) => d.name === result.doctor) || {
            name: result.doctor,
            specialty: result.specialty,
            slots: result.slots,
          };
          state.waitingForSymptoms = false;
          addBotMessage(`You may need a consultation with a ${state.selectedDoctor.specialty}.`);
          askForLocation();
        } else {
          addBotMessage("Sorry, I couldn't understand. Could you rephrase?");
        }
      } catch (err) {
        console.error(err);
        addBotMessage(`Error: ${err.message}`);
      }
    } else if (state.waitingForSlot) {
      if (state.selectedDoctor.slots.includes(message)) {
        selectSlot(message, state.selectedDoctor);
      } else {
        addBotMessage("Please select an available time from the buttons below.");
      }
  } else {
    addBotMessage("How else can I assist you?");
  }
}

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
      if (imagePromptRow) {
        imagePromptRow.remove();
        imagePromptRow = null;
      }
      analyzeImage(file);
    }
    e.target.value = "";
  }

  async function analyzeImage(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      addUserImage(reader.result);
      const stopLoading = showAnalyzing();
      try {
        const messages = [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  `A patient describes: ${state.lastSymptom}. ` +
                  "Examine the skin photo and briefly describe in one or two sentences what you see. " +
                  "Respond ONLY with JSON {\"desc\":\"short description\", \"diff\": [\"Diag1\", \"Diag2\", \"Diag3\"]}.",
              },
              { type: "image_url", image_url: { url: reader.result } },
            ],
          },
        ];
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "gpt-4o", messages }),
        });
        const data = await response.json();
        let diag = "unsure";
        let desc = "";
        if (response.ok) {
          let content = data.choices?.[0]?.message?.content?.trim();
          if (content) {
            // remove Markdown code fences
            content = content.replace(/```json|```/g, "").trim();
            try {
              const parsed = JSON.parse(content);
              if (Array.isArray(parsed.diff) && parsed.diff.length) {
                diag = parsed.diff[0];
              }
              if (typeof parsed.desc === "string") {
                desc = parsed.desc.trim();
              }
            } catch {
              const firstLine = content.split(/\n/)[0];
              diag = firstLine.split(/[\.]/)[0];
              desc = content;
            }
          }
        }
        stopLoading();
        state.awaitingImage = false;
        const derm = DOCTORS.find((d) => d.specialty === "Dermatologist");
        state.selectedDoctor = derm;
        state.waitingForSymptoms = false;
        const messageDesc = desc ? `${desc} ` : "";
        addBotMessage(
          `${messageDesc}Looks like ${diag} \u2014 but a dermatologist will give the final word. Let\u2019s book you in!`
        );
        askForLocation();
      } catch (err) {
        console.error(err);
        stopLoading();
        state.awaitingImage = false;
        addBotMessage(
          "Error analyzing image. We'll book you with a dermatologist to be safe."
        );
        const derm = DOCTORS.find((d) => d.specialty === "Dermatologist");
        state.selectedDoctor = derm;
        state.waitingForSymptoms = false;
        askForLocation();
      }
    };
    reader.readAsDataURL(file);
  }

  sendButton.addEventListener("click", handleUserMessage);
  imageInput.addEventListener("change", handleImageUpload);
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleUserMessage();
  });
  clearChatButton.addEventListener("click", clearChat);

  document.getElementById("theme-button").addEventListener("click", () => {
    const link = document.getElementById("theme-link");
    const svgImage = document.getElementById("theme-icon");
    if (link.href.endsWith("styles.css")) {
      link.href = "dark_theme.css";
      svgImage.src = "/dark.svg";
    } else {
      link.href = "styles.css";
      svgImage.src = "/white.svg";
    }
  });

  updateSummary();
  showConsentPrompt();
});
