document.addEventListener("DOMContentLoaded", () => {
  const API_KEY = ""; // Set your OpenAI API key here

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
  const clearChatButton = document.getElementById("clear-chat");
  const optionsContainer = document.getElementById("options-container");
  const summary = document.getElementById("booking-summary");
  const appointmentTemplate = document.getElementById("appointment-options-template");

  const state = {
    waitingForSymptoms: true,
    waitingForSlot: false,
    selectedDoctor: null,
    selectedSlot: null,
    aiQuestions: 0,
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
    summary.innerHTML = "<h3>Your Appointments</h3>";
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
    state.aiQuestions = 0;
    conversation = [{ role: "system", content: basePrompt }];
    updateSummary();
    setTimeout(() => {
      addBotMessage("Hello! What symptoms are you experiencing today?");
    }, 100);
  }

  async function getRecommendation(text) {
    conversation.push({ role: "user", content: text });
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ model: "gpt-3.5-turbo", messages: conversation }),
      });
      const data = await response.json();
      const reply = data.choices[0].message.content.trim();
      conversation.push({ role: "assistant", content: reply });
      return JSON.parse(reply);
    } catch (e) {
      console.error("AI error", e);
      return {};
    }
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

  async function handleUserMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    addUserMessage(message);
    userInput.value = "";

    if (state.waitingForSymptoms) {
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
        state.waitingForSlot = true;
        addBotMessage(`You may need a consultation with a ${state.selectedDoctor.specialty}. Available times:`);
        showAppointmentOptions(state.selectedDoctor);
      } else {
        addBotMessage("Sorry, I couldn't understand. Could you rephrase?");
      }
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
