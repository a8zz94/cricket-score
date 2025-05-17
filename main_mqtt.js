var topic = -1;
let isStartConnectDone = false;

function startConnect(_topic) {
    // Generate a client ID with a random component
    clientID = "cricket_scorer_" + parseInt(Math.random() * 10000);
    
    // Use a consistent MQTT broker
    host = "test.mosquitto.org";
    port = 8081; // Use secure WebSocket port
    
    // Generate a topic if one isn't provided
    topic = _topic ?? "" + parseInt(Math.random() * 1000000);
    
    // Create share link
    let serializedLink = document.location.origin + "/watch.html?matchCode=" + topic;
    serializedLink = encodeURI(serializedLink);
    
    // Update share modal content
    document.getElementById("shareModalBody").innerHTML =
        "<h4>Share this code:" +
        '&nbsp;<span class="badge bg-secondary">' +
        topic +
        "</span>&nbsp;" +
        '<button class="btn btn-primary" onclick="navigator.clipboard.writeText(\'' +
        topic +
        '\')" data-dismiss="modal">' +
        '<span class="material-symbols-outlined">content_copy</span>' +
        "</span></h4>";
    
    document.getElementById("shareModalFooter").innerHTML =
        '<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>' +
        '<button type="button" class="btn btn-default" onclick="navigator.clipboard.writeText(\'' +
        serializedLink +
        '\')" data-dismiss="modal">Copy link</button>' +
        '<a href="whatsapp://send?text=Follow the match score at: ' +
        serializedLink +
        '" data-action="share/whatsapp/share" class="btn btn-success">Share via Whatsapp</a>';
    
    // Log connection info
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
    
    // Add connection status tracking
    isStartConnectDone = false; // Reset to false until connection is confirmed
    
    // Connect to the broker with better error handling
    client.connect({
        onSuccess: onConnect,
        onFailure: function(e) {
            console.error("Connection failed:", e);
            if (document.getElementById("messages")) {
                document.getElementById("messages").innerHTML +=
                    "<span>Connection failed: " + e.errorMessage + "</span><br>";
            }
            isStartConnectDone = false;
        },
        useSSL: true, // Must be true when using WebSockets with HTTPS
        timeout: 10
    });
    
    console.log("Attempting MQTT connection with topic: matchCodeWatch" + topic);
}

function onConnect() {
    console.log("MQTT Connected successfully");
    
    if (document.getElementById("messages")) {
        document.getElementById("messages").innerHTML +=
            "<span> Connected to MQTT broker successfully </span><br>" +
            "<span> Subscribing to topic matchCodeWatch" + topic + "origin</span><br>";
    }
    
    // Subscribe to the feedback channel
    client.subscribe("matchCodeWatch" + topic + "origin");
    
    // Set the connection flag to true only after connection is established
    isStartConnectDone = true;
    
    // Add a visual indicator
	if (document.getElementById("sharingStatus")) {
		document.getElementById("sharingStatus").innerHTML = 
			'<img src="/icons/wifi.png" alt="Connected" class="connection-icon" title="Connected and sharing active">';
	}
	
    // Send a test message to confirm publishing works
    try {
        const testMsg = new Paho.MQTT.Message(JSON.stringify({test: "Connection test"}));
        testMsg.destinationName = "matchCodeWatch" + topic;
        client.send(testMsg);
        console.log("Test message sent successfully");
    } catch (e) {
        console.error("Failed to send test message:", e);
    }
}

function onConnectionLost(responseObject) {
    isStartConnectDone = false;
    
    if (document.getElementById("messages")) {
        document.getElementById("messages").innerHTML +=
            "<span> ERROR: Connection is lost.</span><br>";
        if (responseObject.errorCode !== 0) {
            document.getElementById("messages").innerHTML +=
                "<span> ERROR:" + responseObject.errorMessage + "</span><br>";
        }
    }
    
	if (document.getElementById("sharingStatus")) {
		document.getElementById("sharingStatus").innerHTML = 
			'<img src="/icons/no-wifi.png" alt="Disconnected" class="connection-icon" title="Connection lost - click Share again">';
	}
    
    console.log("MQTT Connection lost: ", responseObject.errorMessage);
    
    // Attempt to reconnect
    setTimeout(function() {
        if (!isStartConnectDone) {
            console.log("Attempting to reconnect...");
            startConnect(topic);
        }
    }, 5000);
}

function onMessageArrived(message) {
    console.log("OnMessageArrived: " + message.payloadString);
    
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
        
        // Handle initialization requests from viewers
        if (payload.init !== undefined && payload.init === "true") {
            console.log("Received initialization request from viewer");
            sendInitVariables();
        }
        
        // Acknowledge viewer connection
        if (payload.viewer_joined) {
            console.log("Viewer joined:", payload.client_id);
            // You could update a viewer count here if desired
        }
    } catch (e) {
        console.error("Error parsing message", e);
    }
}

function publishMessage(msg) {
    // Better check if we're ready to publish
    if (!isStartConnectDone) {
        console.log("Cannot publish: not connected");
        return;
    }
    
    if (!client) {
        console.log("Cannot publish: client not initialized");
        return;
    }
    
    if (!client.isConnected()) {
        console.log("Cannot publish: client initialized but not connected");
        // Attempt to reconnect
        startConnect(topic);
        return;
    }
    
    try {
        const message = new Paho.MQTT.Message(msg);
        message.destinationName = "matchCodeWatch" + topic;
        client.send(message);
        
        if (document.getElementById("messages")) {
            document.getElementById("messages").innerHTML +=
                "<span> Message to topic matchCodeWatch" + topic + " is sent </span><br>";
        }
        
        console.log("Published message to matchCodeWatch" + topic);
    } catch (e) {
        console.error("Error publishing message", e);
        isStartConnectDone = false; // Reset the flag
        
        // Attempt to reconnect
        setTimeout(function() {
            if (!isStartConnectDone) {
                console.log("Error occurred while publishing. Attempting to reconnect...");
                startConnect(topic);
            }
        }, 2000);
    }
}

// Add this function to check and refresh connection
function checkConnection() {
    if (client && !client.isConnected()) {
        console.log("Connection check failed - reconnecting...");
        isStartConnectDone = false;
        startConnect(topic);
        return false;
    }
    return isStartConnectDone;
}

// Add a heartbeat to keep connection alive
setInterval(function() {
    if (isStartConnectDone && client && client.isConnected()) {
        try {
            const heartbeat = new Paho.MQTT.Message(JSON.stringify({heartbeat: new Date().toISOString()}));
            heartbeat.destinationName = "matchCodeWatch" + topic + "heartbeat";
            client.send(heartbeat);
        } catch (e) {
            console.log("Heartbeat failed, connection may be down");
        }
    }
}, 30000); // Every 30 seconds