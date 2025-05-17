var topic = -1;
let isStartConnectDone = false;

function startConnect(_topic) {
    // Generate a client ID with a random component
    clientID = "cricket_scorer_" + parseInt(Math.random() * 10000);
    
    // Use a consistent MQTT broker
    host = "test.mosquitto.org";
    port = 8081;
    
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
    
    // Connect to the broker
    client.connect({
        onSuccess: onConnect,
        useSSL: false
    });
    
    isStartConnectDone = true;
    console.log("MQTT connection established with topic: matchCodeWatch" + topic);
}

function onConnect() {
    if (document.getElementById("messages")) {
        document.getElementById("messages").innerHTML +=
            "<span> Subscribing to topic matchCodeWatch" + topic + "origin</span><br>";
    }
    
    // Subscribe to the feedback channel
    client.subscribe("matchCodeWatch" + topic + "origin");
    
    // Send an initial status update
    console.log("MQTT Connected successfully");
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
    
    isStartConnectDone = false;
    console.log("MQTT Connection lost: ", responseObject.errorMessage);
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
    } catch (e) {
        console.error("Error parsing message", e);
    }
}

function publishMessage(msg) {
    if (!isStartConnectDone || !client || !client.isConnected()) {
        console.log("Cannot publish: not connected");
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
    }
}