// ===== STORAGE UTILITIES =====
const STORAGE_KEYS = {
  USER_GOAL: 'fitcoach_user_goal',
  USER_CULTURE: 'fitcoach_user_culture',
  USER_DETAILS: 'fitcoach_user_details',
  NUTRITION_ONLY: 'fitcoach_nutrition_only',
  HOME_ONLY: 'fitcoach_home_only',
  PROGRESS_LOG: 'fitcoach_progress_log',
  BMI: 'fitcoach_bmi'
};

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

function loadFromStorage(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (e) {
    console.error('Storage error:', e);
    return null;
  }
}

// ===== ONBOARDING =====
let selectedGoals = [];
let selectedCulture = null;

function selectGoal(card) {
  const goal = card.dataset.goal;
  
  if (selectedGoals.includes(goal)) {
    // Deselect
    selectedGoals = selectedGoals.filter(g => g !== goal);
    card.classList.remove('selected');
  } else {
    // Select (max 2)
    if (selectedGoals.length < 2) {
      selectedGoals.push(goal);
      card.classList.add('selected');
    }
  }
  
  document.getElementById('goalCta').disabled = selectedGoals.length === 0;
}

function selectCulture(card) {
  document.querySelectorAll('.onboarding-card[data-culture]').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  selectedCulture = card.dataset.culture;
  document.getElementById('cultureCta').disabled = false;
}

function goToCulture() {
  if (selectedGoals.length === 0) return;
  saveToStorage(STORAGE_KEYS.USER_GOAL, selectedGoals);
  document.getElementById('goalScreen').classList.add('hidden');
  document.getElementById('cultureScreen').classList.remove('hidden');
}

function backToGoals() {
  document.getElementById('cultureScreen').classList.add('hidden');
  document.getElementById('goalScreen').classList.remove('hidden');
}

function skipCulture() {
  if (selectedGoals.length === 0) return;
  if (!selectedCulture) selectedCulture = 'other';
  document.getElementById('cultureScreen').classList.add('hidden');
  document.getElementById('detailsScreen').classList.remove('hidden');
}

function goToDetails() {
  if (selectedGoals.length === 0) return;
  document.getElementById('cultureScreen').classList.add('hidden');
  document.getElementById('detailsScreen').classList.remove('hidden');
}

function backToCulture() {
  document.getElementById('detailsScreen').classList.add('hidden');
  document.getElementById('cultureScreen').classList.remove('hidden');
}

function finishOnboarding() {
  if (selectedGoals.length === 0) return;
  
  // Validate age if provided
  const ageInput = document.getElementById('userAge');
  if (ageInput && ageInput.value) {
    const age = parseInt(ageInput.value);
    if (isNaN(age) || age < 10 || age > 120) {
      alert('Please enter a valid age between 10 and 120');
      ageInput.focus();
      return;
    }
  }
  
  saveToStorage(STORAGE_KEYS.USER_GOAL, selectedGoals);
  if (selectedCulture) {
    saveToStorage(STORAGE_KEYS.USER_CULTURE, selectedCulture);
  }
  
  // Save user details
  const userDetails = {
    name: document.getElementById('userName')?.value?.trim() || '',
    age: ageInput?.value?.trim() || '',
    health: document.getElementById('userHealth')?.value?.trim() || '',
    allergies: document.getElementById('userAllergies')?.value?.trim() || ''
  };
  saveToStorage(STORAGE_KEYS.USER_DETAILS, userDetails);
  
  updateHeaderDisplay();
  
  document.getElementById('detailsScreen').classList.add('hidden');
  document.getElementById('cultureScreen').classList.add('hidden');
  document.getElementById('chatContainer').classList.remove('hidden');
  document.getElementById('quickPrompts').classList.remove('hidden');
  
  loadWelcomeMessage();
  updateQuickPrompts();
}

function updateHeaderDisplay() {
  const goals = loadFromStorage(STORAGE_KEYS.USER_GOAL);
  const culture = loadFromStorage(STORAGE_KEYS.USER_CULTURE);
  
  const goalNames = {
    lose_weight: 'Lose Weight',
    build_muscle: 'Build Muscle',
    eat_healthy: 'Eat Healthier',
    get_stronger: 'Get Stronger'
  };
  
  const cultureNames = {
    nigerian: 'Nigerian',
    west_african: 'West African',
    east_african: 'East African',
    south_african: 'South African',
    indian: 'Indian',
    chinese: 'Chinese',
    japanese: 'Japanese',
    korean: 'Korean',
    vietnamese: 'Vietnamese',
    thai: 'Thai',
    mexican: 'Mexican',
    caribbean: 'Caribbean',
    other: 'Other'
  };
  
  const goalsText = Array.isArray(goals) ? goals.map(g => goalNames[g]).filter(Boolean).join(', ') : (goalNames[goals] || '');
  document.getElementById('currentGoalDisplay').textContent = `${cultureNames[culture] || ''} ${culture && goalsText ? '•' : ''} ${goalsText}`;
}

// ===== CHANGE GOAL/CULTURE =====
function openChangeGoal() {
  closeSidebar();
  document.getElementById('chatContainer').classList.add('hidden');
  document.getElementById('quickPrompts').classList.add('hidden');
  document.getElementById('goalScreen').classList.remove('hidden');
  
  const savedGoals = loadFromStorage(STORAGE_KEYS.USER_GOAL);
  const savedCulture = loadFromStorage(STORAGE_KEYS.USER_CULTURE);
  
  selectedGoals = Array.isArray(savedGoals) ? savedGoals : [];
  selectedCulture = savedCulture;
  
  // Update UI
  document.querySelectorAll('.onboarding-card[data-goal]').forEach(c => {
    c.classList.toggle('selected', selectedGoals.includes(c.dataset.goal));
  });
  document.getElementById('goalCta').disabled = selectedGoals.length === 0;
  
  if (savedCulture) {
    document.querySelectorAll('.onboarding-card[data-culture]').forEach(c => {
      c.classList.toggle('selected', c.dataset.culture === savedCulture);
    });
  }
}

// ===== SETTINGS =====
function toggleSetting(setting) {
  const toggleMap = {
    nutritionOnly: { key: STORAGE_KEYS.NUTRITION_ONLY, element: 'nutritionToggle' },
    homeOnly: { key: STORAGE_KEYS.HOME_ONLY, element: 'homeToggle' }
  };
  
  const config = toggleMap[setting];
  const element = document.getElementById(config.element);
  const current = loadFromStorage(config.key) || false;
  
  element.classList.toggle('active');
  saveToStorage(config.key, !current);
  
  updateQuickPrompts();
}

function loadSettings() {
  const nutritionOnly = loadFromStorage(STORAGE_KEYS.NUTRITION_ONLY);
  const homeOnly = loadFromStorage(STORAGE_KEYS.HOME_ONLY);
  
  if (nutritionOnly) {
    document.getElementById('nutritionToggle').classList.add('active');
  }
  if (homeOnly === false) {
    document.getElementById('homeToggle').classList.remove('active');
  }
}

// ===== QUICK PROMPTS =====
function getSmartPrompts() {
  const hour = new Date().getHours();
  const nutritionOnly = loadFromStorage(STORAGE_KEYS.NUTRITION_ONLY);
  const homeOnly = loadFromStorage(STORAGE_KEYS.HOME_ONLY);
  
  let prompts = [];
  
  if (hour >= 5 && hour < 10) {
    prompts.push({ text: 'Healthy breakfast ideas', emoji: 'Breakfast' });
  } else if (hour >= 12 && hour < 14) {
    prompts.push({ text: 'Light lunch options', emoji: 'Lunch' });
  } else if (hour >= 18 && hour < 21) {
    prompts.push({ text: 'Dinner ideas', emoji: 'Dinner' });
  }
  
  const userGoals = loadFromStorage(STORAGE_KEYS.USER_GOAL);
  const goals = Array.isArray(userGoals) ? userGoals : [userGoals];
  
  if (nutritionOnly) {
    prompts.push({ text: 'Give me a healthy meal plan', emoji: 'Meal Plan' });
    prompts.push({ text: 'Foods to avoid', emoji: 'Foods to Avoid' });
  } else {
    if (goals.includes('lose_weight')) {
      prompts.push({ text: 'Fat burning workout', emoji: 'Fat Burn' });
      prompts.push({ text: 'Low calorie meals', emoji: 'Low Cal' });
    }
    if (goals.includes('build_muscle')) {
      prompts.push({ text: 'Protein rich meals', emoji: 'Protein' });
      prompts.push({ text: 'Muscle building workout', emoji: 'Muscle' });
    }
    if (goals.includes('eat_healthy')) {
      prompts.push({ text: 'Give me a meal plan', emoji: 'Meal Plan' });
    }
    if (goals.includes('get_stronger') && prompts.length < 3) {
      prompts.push({ text: 'Give me a workout', emoji: 'Workout' });
    }
  }
  
  if (homeOnly) {
    prompts.push({ text: 'Home workout', emoji: 'Home' });
  }
  
  return prompts.slice(0, 4);
}

function updateQuickPrompts() {
  const container = document.getElementById('quickPrompts');
  const prompts = getSmartPrompts();
  
  container.innerHTML = prompts.map(p => 
    `<button class="quick-prompt" onclick="sendQuickPrompt('${p.text}')">${p.text}</button>`
  ).join('');
}

// ===== CHAT =====
function getTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function appendMessage(content, sender, showCards = false) {
  const chatBox = document.getElementById("chat");
  const messageClass = sender === "user" ? "user" : "bot";
  const timestamp = getTimestamp();
  
  const welcomeMessage = chatBox.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.remove();
  }

  const formattedContent = sender === "bot" ? marked.parse(content) : content;
  const avatarUrl = "https://res.cloudinary.com/uncleteslim/image/upload/v1745347704/logo_zx2nts.png";
  
  const avatarHTML = sender === "bot" 
    ? `<img class="message-avatar" src="${avatarUrl}" alt="Coach" />`
    : '';

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${messageClass}`;
  messageDiv.innerHTML = `
    ${avatarHTML}
    <div class="message-content">
      <div class="message-bubble">${formattedContent}</div>
      <span class="message-time">${timestamp}</span>
    </div>
  `;

  chatBox.appendChild(messageDiv);
  
  if (showCards) {
    appendChoiceCards();
  }
  
  chatBox.scrollTop = chatBox.scrollHeight;
}

function appendChoiceCards() {
  const chatBox = document.getElementById("chat");
  
  const cards = [
    { text: 'Lose Weight', value: 'I want to lose weight' },
    { text: 'Build Muscle', value: 'I want to build muscle' },
    { text: 'Eat Healthier', value: 'I want to eat healthier' },
    { text: 'Get Stronger', value: 'I want to get stronger' },
    { text: 'Meal Plan', value: 'Give me a meal plan' },
    { text: 'Home Workout', value: 'Give me a home workout' }
  ];
  
  const cardsHTML = `
    <div class="choice-cards-container">
      <p class="choice-cards-label">Quick actions:</p>
      <div class="choice-cards">
        ${cards.map(c => `<button class="choice-card" onclick="sendQuickPrompt('${c.value}')">${c.text}</button>`).join('')}
      </div>
    </div>
  `;
  
  const cardsDiv = document.createElement('div');
  cardsDiv.className = 'message bot';
  cardsDiv.innerHTML = cardsHTML;
  
  chatBox.appendChild(cardsDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() {
  const chatBox = document.getElementById("chat");
  const welcomeMessage = chatBox.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.remove();
  }

  const avatarUrl = "https://res.cloudinary.com/uncleteslim/image/upload/v1745347704/logo_zx2nts.png";
  
  const typingDiv = document.createElement('div');
  typingDiv.className = 'message bot';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = `
    <img class="message-avatar" src="${avatarUrl}" alt="Coach" />
    <div class="typing-bubble">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;
  
  chatBox.appendChild(typingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function hideTyping() {
  const typingIndicator = document.getElementById('typing-indicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

async function sendMessage() {
  const inputField = document.getElementById("userInput");
  const sendBtn = document.getElementById("sendBtn");
  const userMessage = inputField.value.trim();
  if (!userMessage) return;

  sendBtn.disabled = true;
  appendMessage(userMessage, "user");
  inputField.value = "";
  showTyping();

  try {
    const userGoal = loadFromStorage(STORAGE_KEYS.USER_GOAL);
    const userCulture = loadFromStorage(STORAGE_KEYS.USER_CULTURE);
    const userDetails = loadFromStorage(STORAGE_KEYS.USER_DETAILS) || {};
    const nutritionOnly = loadFromStorage(STORAGE_KEYS.NUTRITION_ONLY);
    const homeOnly = loadFromStorage(STORAGE_KEYS.HOME_ONLY);
    
    const response = await fetch("/get_response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: userMessage,
        context: {
          goal: userGoal,
          culture: userCulture,
          name: userDetails.name,
          age: userDetails.age,
          health: userDetails.health,
          allergies: userDetails.allergies,
          nutritionOnly: nutritionOnly,
          homeOnly: homeOnly
        }
      }),
    });

    const data = await response.json();
    hideTyping();
    appendMessage(data.response, "bot");
  } catch (error) {
    hideTyping();
    appendMessage("Oops! Something went wrong. Please try again.", "bot");
    console.error("Error:", error);
  } finally {
    sendBtn.disabled = false;
    inputField.focus();
  }
}

function sendQuickPrompt(prompt) {
  const inputField = document.getElementById("userInput");
  inputField.value = prompt;
  sendMessage();
}

async function loadWelcomeMessage() {
  const chatBox = document.getElementById("chat");
  
  if (document.getElementById('chatContainer').classList.contains('hidden')) {
    return;
  }
  
  showTyping();
  try {
    const userGoal = loadFromStorage(STORAGE_KEYS.USER_GOAL);
    const userCulture = loadFromStorage(STORAGE_KEYS.USER_CULTURE);
    const userDetails = loadFromStorage(STORAGE_KEYS.USER_DETAILS) || {};
    
    const response = await fetch("/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        goal: userGoal,
        culture: userCulture,
        name: userDetails.name,
        age: userDetails.age,
        health: userDetails.health,
        allergies: userDetails.allergies
      })
    });
    const data = await response.json();
    hideTyping();
    appendMessage(data.response, "bot", true);
  } catch (error) {
    hideTyping();
    console.error("Error loading welcome:", error);
  }
}

// ===== SIDEBAR =====
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('show');
  loadProgressChart();
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

// ===== BMI =====
function calculateBMI() {
  const weight = parseFloat(document.getElementById('bmiWeight').value);
  const height = parseFloat(document.getElementById('bmiHeight').value);
  
  if (!weight || !height) {
    alert('Please enter both weight and height');
    return;
  }
  
  const heightInMeters = height / 100;
  const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
  
  let category = '';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal weight';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  
  document.getElementById('bmiValue').textContent = bmi;
  document.getElementById('bmiCategory').textContent = category;
  document.getElementById('bmiResult').classList.add('show');
  
  saveToStorage(STORAGE_KEYS.BMI, { weight, height, bmi, category });
}

// ===== PROGRESS =====
let progressChart = null;

function logProgress() {
  const weight = parseFloat(document.getElementById('progressWeight').value);
  if (!weight) {
    alert('Please enter your weight');
    return;
  }
  
  const log = loadFromStorage(STORAGE_KEYS.PROGRESS_LOG) || [];
  log.push({
    weight,
    date: new Date().toISOString()
  });
  
  saveToStorage(STORAGE_KEYS.PROGRESS_LOG, log);
  document.getElementById('progressWeight').value = '';
  loadProgressChart();
}

function loadProgressChart() {
  const log = loadFromStorage(STORAGE_KEYS.PROGRESS_LOG) || [];
  
  if (log.length === 0) {
    document.getElementById('statCurrent').textContent = '--';
    document.getElementById('statStart').textContent = '--';
    document.getElementById('statChange').textContent = '--';
    return;
  }
  
  const sorted = [...log].sort((a, b) => new Date(a.date) - new Date(b.date));
  const current = sorted[sorted.length - 1].weight;
  const start = sorted[0].weight;
  const change = (current - start).toFixed(1);
  
  document.getElementById('statCurrent').textContent = current + 'kg';
  document.getElementById('statStart').textContent = start + 'kg';
  document.getElementById('statChange').textContent = (change > 0 ? '+' : '') + change + 'kg';
  document.getElementById('statChange').style.color = change < 0 ? '#22c55e' : (change > 0 ? '#ef4444' : '#0d9488');
  
  const ctx = document.getElementById('progressChart');
  if (!ctx) return;
  
  if (progressChart) {
    progressChart.destroy();
  }
  
  const labels = sorted.map((_, i) => i + 1);
  const data = sorted.map(e => e.weight);
  
  progressChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Weight (kg)',
        data,
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13, 148, 136, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#0d9488'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: false },
        x: { display: false }
      }
    }
  });
}

// ===== SHARE =====
function shareToWhatsApp() {
  const goal = loadFromStorage(STORAGE_KEYS.USER_GOAL) || 'fitness';
  const culture = loadFromStorage(STORAGE_KEYS.USER_CULTURE) || 'African';
  
  const goalNames = {
    lose_weight: 'Lose Weight',
    build_muscle: 'Build Muscle',
    eat_healthy: 'Eat Healthier',
    get_stronger: 'Get Stronger'
  };
  
  const text = `Hey! I'm using FitForAll - an AI fitness coach that understands ${culture} food and culture!

No more generic Western diet plans. They have meal plans for Nigerian, Indian, Chinese, Mexican, Caribbean, and more!

Check it out: https://fitforall.app

Let's get fit together!`;
  
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  
  const savedGoal = loadFromStorage(STORAGE_KEYS.USER_GOAL);
  const savedCulture = loadFromStorage(STORAGE_KEYS.USER_CULTURE);
  const savedDetails = loadFromStorage(STORAGE_KEYS.USER_DETAILS);
  
  if (savedGoal && savedCulture) {
    document.getElementById('goalScreen').classList.add('hidden');
    document.getElementById('cultureScreen').classList.add('hidden');
    document.getElementById('detailsScreen').classList.add('hidden');
    document.getElementById('chatContainer').classList.remove('hidden');
    document.getElementById('quickPrompts').classList.remove('hidden');
    
    updateHeaderDisplay();
    
    if (savedDetails) {
      if (savedDetails.name) document.getElementById('userName').value = savedDetails.name;
      if (savedDetails.age) document.getElementById('userAge').value = savedDetails.age;
      if (savedDetails.health) document.getElementById('userHealth').value = savedDetails.health;
      if (savedDetails.allergies) document.getElementById('userAllergies').value = savedDetails.allergies;
    }
    
    loadWelcomeMessage();
    updateQuickPrompts();
  }
  
  const inputField = document.getElementById("userInput");
  inputField.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
});
