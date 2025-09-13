// MongoDB initialization script for Docker ⚠️ Only for local development ⚠️
// This script creates the databases and users for the Birdie Bash Platform

// Switch to admin database for user creation
db = db.getSiblingDB('admin');

// Create databases
db = db.getSiblingDB('birdie_auth');
db.createCollection('users');

db = db.getSiblingDB('birdie_events');
db.createCollection('events');
db.createCollection('players');
db.createCollection('courts');

print('MongoDB databases initialized for Birdie Bash Platform');