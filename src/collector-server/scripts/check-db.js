require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Attack = require('../src/models/Attack');

const checkDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const userCount = await User.countDocuments();
        const users = await User.find({}, 'username email role');

        const attackCount = await Attack.countDocuments();
        const attacks = await Attack.find().limit(5);

        console.log('\n--- USERS ---');
        console.log(`Total Users: ${userCount}`);
        console.table(users.map(u => ({ username: u.username, email: u.email, role: u.role })));

        console.log('\n--- ATTACKS ---');
        console.log(`Total Attacks: ${attackCount}`);
        if (attackCount > 0) {
            console.log('Last 5 attacks:', attacks);
        } else {
            console.log('No attacks saved yet (Real-time only mode).');
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkDB();
