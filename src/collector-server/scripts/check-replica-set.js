require('dotenv').config();
const { MongoClient } = require('mongodb');

const checkReplicaSetStatus = async () => {
    const client = new MongoClient(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
    });
    
    try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        console.log('Connected to MongoDB');
        
        const admin = client.db().admin();
        
        try {
            const status = await admin.command({ replSetGetStatus: 1 });
            
            console.log('\n=== REPLICA SET STATUS ===');
            console.log(`Set Name: ${status.set}`);
            console.log(`Date: ${status.date}`);
            
            console.log('\n--- MEMBERS ---');
            status.members.forEach(member => {
                console.log(`${member.name}: ${member.stateStr} (health: ${member.health})`);
            });
            
            const config = await admin.command({ replSetGetConfig: 1 });
            console.log('\n--- CONFIGURATION ---');
            console.log(`Version: ${config.config.version}`);
            config.config.members.forEach(member => {
                console.log(`Member ${member._id}: ${member.host} (priority: ${member.priority})`);
            });

            const db = client.db('distributed-honeypot');
            const testWrite = await db.collection('_test').insertOne({ 
                timestamp: new Date(),
                test: 'replica-set-check'
            });
            console.log('\nWrite test successful');
            
            await db.collection('_test').deleteOne({ _id: testWrite.insertedId });
            
        } catch (replError) {
            if (replError.codeName === 'NotYetInitialized') {
                console.log('\nReplica set not yet initialized');
            } else {
                console.error('\nReplica set error:', replError.message);
            }
        }
        
    } catch (error) {
        console.error('Connection error:', error.message);
    } finally {
        await client.close();
    }
};

checkReplicaSetStatus();