
const mongoose = require('mongoose');
require('dotenv').config();

const Customer = require('./models/Customer');

async function test() {
    try {
        console.log('Attempting to connect to Mongo...');
        // Use a dummy connection string if env var is missing/invalid for testing schema only, 
        // but ideally we need real connection to test saving.
        // However, we can test validation without saving using .validate()

        console.log('Customer model loaded successfully.');

        const customer = new Customer({
            name: 'Test Customer',
            phone: '1234567890',
            email: 'test@example.com',
            gstin: '22AAAAA0000A1Z5' // Valid format from schema regex?
        });

        console.log('Validating customer...');
        await customer.validate();
        console.log('Validation successful!');

    } catch (err) {
        console.error('Error caught:');
        console.error(err);
    }
}

test();
