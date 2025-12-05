require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Honeypot = require('../src/models/Honeypot');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/distributed-honeypot';

const seedData = async () => {
    try {
        console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB Connected');


        try {
            await User.collection.drop();
            console.log('Dropped User collection');
        } catch (e) {
            console.log('User collection did not exist, skipping drop');
        }

        try {
            await Honeypot.collection.drop();
            console.log('Dropped Honeypot collection');
        } catch (e) {
            console.log('Honeypot collection did not exist, skipping drop');
        }

        const adminUser = await User.create({
            username: 'admin',
            email: 'admin@gmail.com',
            password: 'admin',
            role: 'admin'
        });
        console.log('Created Admin User: admin@gmail.com / admin');

        const normalUser = await User.create({
            username: 'user',
            email: 'user@gmail.com',
            password: 'password',
            role: 'user'
        });
        console.log('Created Normal User: user@gmail.com / password');

        console.log('Database seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
