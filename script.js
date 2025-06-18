document.addEventListener("DOMContentLoaded", () => {
  const chatMessages = document.getElementById("chat-messages");
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  const clearChatButton = document.getElementById("clear-chat");
  const optionsContainer = document.getElementById("options-container");
  const summary = document.getElementById("booking-summary");
  const appointmentTemplate = document.getElementById("appointment-options-template");

  const state = {
    waitingForSymptoms: true,
    waitingForSlot: false,
    selectedDoctor: null,
    selectedSlot: null,
  };

  function addUserMessage(message) {
    const el = document.createElement("div");
    el.className = "message user";
    el.innerHTML = `<div class="message-content">${message}</div>`;
    chatMessages.appendChild(el);
    scrollToBottom();
  }

  function addBotMessage(message) {
    const el = document.createElement("div");
    el.className = "message bot";
    el.innerHTML = `<div class="message-content">${message}</div>`;
    chatMessages.appendChild(el);
    scrollToBottom();
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function updateSummary() {
    summary.innerHTML = "<h3>Your Appointment</h3>";
    if (state.selectedDoctor && state.selectedSlot) {
      const div = document.createElement("div");
      div.className = "summary-content";
      div.innerHTML = `<p><strong>${state.selectedDoctor.name}</strong> (${state.selectedDoctor.specialty})</p>` +
        `<p>${state.selectedSlot}</p>`;
      summary.appendChild(div);
    } else {
      const div = document.createElement("div");
      div.className = "summary-content";
      div.innerHTML = "<p>No appointment yet</p>";
      summary.appendChild(div);
    }
  }

  function clearChat() {
    chatMessages.innerHTML = "";
    optionsContainer.innerHTML = "";
    optionsContainer.classList.remove("active");
    state.waitingForSymptoms = true;
    state.waitingForSlot = false;
    state.selectedDoctor = null;
    state.selectedSlot = null;
    updateSummary();
    setTimeout(() => {
      addBotMessage("Hello! What symptoms are you experiencing today?");
    }, 100);
  }

  function triage(symptoms) {
    const text = symptoms.toLowerCase();
    if (text.includes("chest") || text.includes("heart") || text.includes("tightness")) {
      return { name: "Dr. Adams", specialty: "Cardiologist", slots: ["10:00 tomorrow", "15:00 tomorrow"] };
    }
    return { name: "Dr. Baker", specialty: "General Practitioner", slots: ["11:00 tomorrow", "16:00 tomorrow"] };
  }

  function showAppointmentOptions(doctor) {
    optionsContainer.innerHTML = "";
    if (!appointmentTemplate) return;
    const content = appointmentTemplate.content.cloneNode(true);
    content.querySelector(".doctor-name").textContent = doctor.name;
    const slotList = content.querySelector(".slot-list");
    doctor.slots.forEach((time) => {
      const btn = document.createElement("button");
      btn.className = "glass-button select-slot";
      btn.textContent = time;
      btn.addEventListener("click", () => selectSlot(time));
      slotList.appendChild(btn);
    });
    optionsContainer.appendChild(content);
    optionsContainer.classList.add("active");
  }

  function selectSlot(time) {
    state.selectedSlot = time;
    state.waitingForSlot = false;
    optionsContainer.classList.remove("active");
    addBotMessage(`Appointment with ${state.selectedDoctor.name} confirmed for ${time}. You'll receive a reminder!`);
    updateSummary();
  }

  function handleUserMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    addUserMessage(message);
    userInput.value = "";

    if (state.waitingForSymptoms) {
      state.selectedDoctor = triage(message);
      state.waitingForSymptoms = false;
      state.waitingForSlot = true;
      addBotMessage(`You may need a consultation with a ${state.selectedDoctor.specialty}. Available times:`);
      showAppointmentOptions(state.selectedDoctor);
    } else if (state.waitingForSlot) {
      if (state.selectedDoctor.slots.includes(message)) {
        selectSlot(message);
      } else {
        addBotMessage("Please select an available time from the buttons below.");
      }
    } else {
      addBotMessage("How else can I assist you?");
    }
  }

  sendButton.addEventListener("click", handleUserMessage);
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
  addBotMessage("Hello! What symptoms are you experiencing today?");
});
