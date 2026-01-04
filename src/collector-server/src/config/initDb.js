const mongoose = require('mongoose');
const User = require('../models/User');

const initializeDatabase = async () => {
    try {
        console.log('[Init] Checking database state...');
        const db = mongoose.connection.db;

        const collections = ['users', 'honeypots', 'sessions', 'attacks'];
        const existingCollections = await db.listCollections().toArray();
        const existingNames = existingCollections.map(c => c.name);

        for (const colName of collections) {
            if (!existingNames.includes(colName)) {
                await db.createCollection(colName);
                console.log(`[Init] Created collection: ${colName}`);
            }
        }


        const userCount = await User.countDocuments();

        if (userCount === 0) {
            console.log('[Init] No users found. Creating default Admin...');

            await User.create({
                username: 'admin',
                email: 'admin@gmail.com',
                password: 'admin',
                role: 'admin'
            });

            console.log('[Init] Default Admin created: admin@gmail.com / admin');
        } else {
            console.log('[Init] Users already exist. Skipping Admin creation.');
        }

    } catch (error) {
        console.error('[Init] Error initializing database:', error);
    }
};

module.exports = initializeDatabase;
