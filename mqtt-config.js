// mqtt-config.js
const MQTT_CONFIG = {
    configs: {
        emqx: {
            host: "broker.emqx.io",
            port: 8084,
            useSSL: true
        },
        hivemq: {
            host: "broker.hivemq.com", 
            port: 8000,
            useSSL: false
        },
        local: {
            host: "coolify.notlocalhost.win",
            port: 9001,
            useSSL: true
        },
        mosquitto: {
            host: "test.mosquitto.org",
            port: 8081,
            useSSL: false
        }
    }
};

// Easy switching - just change this line
const ACTIVE_CONFIG = MQTT_CONFIG.configs.emqx;