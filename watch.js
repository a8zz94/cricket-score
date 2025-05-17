var client;
var clientID = "";
var host = "test.mosquitto.org";
var port = 8081;
var topic = -1;

$(document).ready(function() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if matchCode is provided in URL
    if (urlParams.get("matchCode") != null) {
        console.log("Found match code: " + urlParams.get("matchCode"));
        startConnect(urlParams.get("matchCode"));
    } else {
        // Show modal to enter match code
        let myModal = new bootstrap.Modal(
            document.getElementById("shareModal"),
            {}
        );
        myModal.show();
    }
    
    // Hide debug messages unless in debug mode
    if (urlParams.get("debug") == null || urlParams.get("debug") != "true") {
        $("#messages").hide();
    }
});

function getMatchCodeNConnect() {
    let matchCode = $("#matchCodeInput").val();
    startConnect(matchCode);
}

function startConnect(_topic) {
    // Generate a client ID for this viewer
    clientID = "cricket_viewer_" + parseInt(Math.random() * 10000);
    
    // Use the same MQTT broker as the sender
    host = "test.mosquitto.org";
    port = 8080;
    
    // Set the topic to the match code
    topic = _topic;
    
    // Log connection attempt
    if (document.getElementById("messages")) {
        document.getElementById("messages").innerHTML +=
            "<span> Connecting to " + host + " on port " + port + "</span><br>";
        document.getElementById("messages").innerHTML +=
            "<span> Using the client Id " + clientID + " </span><br>";
    }
    
    // Create and configure MQTT client
    client = new Paho.MQTT.Client(host, Number(port), clientID);
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;
    
    // Connect to the broker
    client.connect({
        onSuccess: onConnect,
		onFailure: function(e) {
			console.error("Connection failed:", e);
			$("#alert").html("Connection failed: " + e.errorMessage);
			$("#alert").addClass("alert-danger").removeClass("alert-success");
			$("#alert").show();
		},
		useSSL: true, // This MUST be true when connecting from HTTPS pages
		timeout: 10
    });
    
    console.log("Attempting to connect to match: " + topic);
    
    // Show connecting message to user
    $("#alert").html("Connecting to match...");
    $("#alert").show();
}

function onConnect() {
    if (document.getElementById("messages")) {
        document.getElementById("messages").innerHTML +=
            "<span> Subscribing to topic matchCodeWatch" + topic + "</span><br>";
    }
    
    // Subscribe to match updates
    client.subscribe("matchCodeWatch" + topic);
    
    // Request initial state
    requestInitialState();
    
    console.log("Connected to MQTT broker, subscribed to matchCodeWatch" + topic);
}

function onConnectionLost(responseObject) {
    if (document.getElementById("messages")) {
        document.getElementById("messages").innerHTML +=
            "<span> ERROR: Connection is lost.</span><br>";
        if (responseObject.errorCode !== 0) {
            document.getElementById("messages").innerHTML +=
                "<span> ERROR:" + responseObject.errorMessage + "</span><br>";
        }
    }
    
    // Show disconnection message
    $("#alert").html("Connection lost. Please refresh the page to reconnect.");
    $("#alert").addClass("alert-danger").removeClass("alert-success");
    $("#alert").show();
    
    console.log("MQTT Connection lost: ", responseObject.errorMessage);
}

function onMessageArrived(message) {
    console.log("Message received: " + message.payloadString);
    
    if (document.getElementById("messages")) {
        document.getElementById("messages").innerHTML +=
            "<span>Topic: " +
            message.destinationName +
            " | Message: " +
            message.payloadString +
            "</span><br>";
    }
    
    try {
        const payload = JSON.parse(message.payloadString);
        
        // Handle HTML element updates
        if (payload.update !== undefined) {
            console.log("Updating element: " + payload.update.eleId);
            $(payload.update.eleId).html(payload.update.newHtml);
        } 
        // Handle initial state data
        else if (payload.init !== undefined && payload.init !== "true") {
            console.log("Received initial state");
            showConnected();
            initHtml(payload);
        } 
        // Handle target mode updates
        else if (payload.isTargetMode !== undefined) {
            setTargetMode(payload.isTargetMode);
        }
    } catch (e) {
        console.error("Error parsing message", e);
    }
}

function requestInitialState() {
    // Send a message to request initial state
    const message = new Paho.MQTT.Message(JSON.stringify({ init: "true" }));
    message.destinationName = "matchCodeWatch" + topic + "origin";
    client.send(message);
    
    console.log("Requested initial state");
}

function updateHtml(eleId, newHtml) {
    $(eleId).html(newHtml);
}

function initHtml(payload) {
    console.log("Initializing HTML with received data");
    
    // Update all HTML elements
    for (let key in payload.init) {
        $(key).html(payload.init[key]);
    }
    
    // Set target mode
    setTargetMode(payload.isTargetMode);
}

function setTargetMode(isTargetMode) {
    isTargetMode = isTargetMode || false;
    
    if (isTargetMode) {
        $("#targetBoard").show();
    } else {
        $("#targetBoard").hide();
    }
}

function showConnected() {
    console.log("Connected successfully!");
    
    // Show success message
    $("#alert").html("Connected successfully! Receiving match data...");
    $("#alert").addClass("alert-success").removeClass("alert-danger");
    $("#alert").show();
    
    // Hide alert after a few seconds
    setTimeout(function() {
        $("#alert").hide();
    }, 4000);
}