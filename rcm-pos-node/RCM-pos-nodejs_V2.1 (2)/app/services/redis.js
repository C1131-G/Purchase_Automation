// Import the redis package
const redis = require("redis");
// Create a Redis client
const redisClient = redis.createClient({
  host: "localhost",
  port: 6379,
});

redisClient.on("connect", function (err) {
  console.log("Connected to redis successfully");
});

// Handle Redis client connection errors
redisClient.on("error", (error) => {
  console.error("Redis connection error:", error);
});

// Set a value in Redis
const setValue = (key, value) => {
  redisClient.set(key, value, (error) => {
    if (error) {
      console.error("Error setting value in Redis:", error);
    } else {
      console.log("Value set in Redis:", key, value);
    }
  });
};

// Get a value from Redis
const getValue = (key, callback) => {
  redisClient.get(key, (error, value) => {
    if (error) {
      console.error("Error getting value from Redis:", error);
      callback(error, null);
    } else {
      console.log("Value retrieved from Redis:", key, value);
      callback(null, value);
    }
  });
};

module.exports = { redisClient, setValue, getValue };
