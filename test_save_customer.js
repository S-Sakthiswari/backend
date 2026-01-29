
const mongoose = require('mongoose');

// Define Schema EXACTLY as in Customer.js to reproduce the issue
// We copy the schema content or we can require it if we trust the require paths. 
// Let's try to require it to be exact.
const Customer = require('./models/Customer');

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect('mongodb://127.0.0.1:27017/billing-system', {
            serverSelectionTimeoutMS: 5000
        });
        console.log('Connected.');

        const customer = new Customer({
            name: 'Crash Test Dummy',
            phone: '9998887779', // Unique phone
            email: 'crashtest@example.com'
        });

        console.log('Saving customer...');
        const saved = await customer.save();
        console.log('Saved successfully:', saved.customerId);

        // CLEANUP
        await Customer.deleteOne({ _id: saved._id });
        console.log('Cleanup done.');

    } catch (err) {
        console.error('---------------------------------------------------');
        console.error('CRASH REPRODUCED:');
        console.error(err);
        console.error('---------------------------------------------------');
    } finally {
        await mongoose.disconnect();
    }
}

run();
