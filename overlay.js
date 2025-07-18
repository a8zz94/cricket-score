var client;
var clientID = "";
var host = ACTIVE_CONFIG.host;
var port = ACTIVE_CONFIG.port;
var topic = -1;
var isStartConnectDone = false;

// Get match code from URL parameters
function getMatchCodeFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("matchCode");
}

// Initialize connection
function initializeOverlay() {
  const matchCode = getMatchCodeFromURL();
  if (matchCode) {
    startConnect(matchCode);
  }
}

// MQTT Connection Functions (using your existing code structure)
function startConnect(_topic) {
  clientID = "cricket_overlay_" + parseInt(Math.random() * 10000);
  topic = _topic;

  client = new Paho.MQTT.Client(host, Number(port), clientID);
  client.onConnectionLost = onConnectionLost;
  client.onMessageArrived = onMessageArrived;

  isStartConnectDone = false;

  client.connect({
    onSuccess: onConnect,
    onFailure: function (e) {
      console.error("Connection failed:", e);
      updateConnectionStatus(false);
    },
    useSSL: true,
    timeout: 10,
  });
}

function onConnect() {
  console.log("MQTT Connected successfully");
  client.subscribe("matchCodeWatch" + topic);
  isStartConnectDone = true;
  updateConnectionStatus(true);
  requestInitialState();
}

function onConnectionLost(responseObject) {
  isStartConnectDone = false;
  updateConnectionStatus(false);
  setTimeout(function () {
    if (!isStartConnectDone) {
      startConnect(topic);
    }
  }, 5000);
}

function onMessageArrived(message) {
  try {
    const payload = JSON.parse(message.payloadString);

    if (payload.update !== undefined) {
      updateElement(payload.update.eleId, payload.update.newHtml);
    } else if (payload.init !== undefined && payload.init !== "true") {
      initializeElements(payload);
    } else if (payload.isTargetMode !== undefined) {
      handleTargetMode(payload.isTargetMode);
    }
  } catch (e) {
    console.error("Error parsing message", e);
  }
}

function requestInitialState() {
  const message = new Paho.MQTT.Message(
    JSON.stringify({
      init: "true",
      viewer_joined: true,
      client_id: clientID,
    })
  );
  message.destinationName = "matchCodeWatch" + topic + "origin";
  client.send(message);
}

// UI Update Functions
function updateElement(eleId, newHtml) {
  const element = document.querySelector(eleId);
  if (element) {
    element.innerHTML = newHtml;

    if (eleId.includes("ball_no_")) {
      updateBallStyling(eleId, newHtml);
    }
  }
}

function initializeElements(payload) {
  for (let key in payload.init) {
    updateElement(key, payload.init[key]);
  }
  handleTargetMode(payload.isTargetMode);
  calculatePartnership();
}

function updateBallStyling(eleId, content) {
  const ball = document.querySelector(eleId);
  if (!ball) return;

  ball.className = "ball";

  if (content === "" || content === undefined) {
    ball.classList.add("empty");
    ball.innerHTML = "";
  } else if (content === "W") {
    ball.classList.add("wicket");
    ball.innerHTML = "W";
  } else if (content === 4) {
    ball.classList.add("four");
    ball.innerHTML = "4";
  } else if (content === 6) {
    ball.classList.add("six");
    ball.innerHTML = "6";
  } else if (content === "+") {
    ball.classList.add("wide");
    ball.innerHTML = "W";
  } else if (content === "NB") {
    ball.classList.add("wide");
    ball.innerHTML = "N";
  } else if (content === "D" || content === "•") {
    ball.classList.add("dot");
    ball.innerHTML = "•";
  } else {
    ball.classList.add("run");
    ball.innerHTML = content;
  }
}

function handleTargetMode(isTargetMode) {
  const targetSection = document.getElementById("targetSection");
  if (isTargetMode) {
    targetSection.style.display = "block";
  } else {
    targetSection.style.display = "none";
  }
}

function calculatePartnership() {
  const strikerRuns = parseInt(
    document.getElementById("striker-runs")?.textContent || 0
  );
  const nonStrikerRuns = parseInt(
    document.getElementById("nonstriker-runs")?.textContent || 0
  );
  const strikerBalls = parseInt(
    document.getElementById("striker-balls")?.textContent || 0
  );
  const nonStrikerBalls = parseInt(
    document.getElementById("nonstriker-balls")?.textContent || 0
  );

  const partnershipRuns = strikerRuns + nonStrikerRuns;
  const partnershipBalls = strikerBalls + nonStrikerBalls;

  const partnershipElement = document.getElementById("partnership");
  if (partnershipElement) {
    partnershipElement.textContent = `${partnershipRuns} (${partnershipBalls})`;
  }
}

function updateConnectionStatus(connected) {
  const status = document.getElementById("connectionStatus");
  if (connected) {
    status.classList.add("connected");
  } else {
    status.classList.remove("connected");
  }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", function () {
  initializeOverlay();
});

// Monitor for batsmen changes to update partnership
const observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    if (
      mutation.target.id &&
      (mutation.target.id.includes("striker") ||
        mutation.target.id.includes("nonstriker"))
    ) {
      calculatePartnership();
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
});
