const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      unique: true,
      sparse: true
    },

    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },

    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },

    address: {
      type: String,
      default: ''
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return (
            !v ||
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v)
          );
        },
        message: 'Invalid email format'
      }
    },

    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      validate: {
        validator: function (v) {
          return (
            !v ||
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v)
          );
        },
        message: 'Invalid GSTIN format'
      }
    },

    type: {
      type: String,
      enum: ['customer', 'supplier', 'both'],
      default: 'customer'
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },

    isActive: {
      type: Boolean,
      default: true
    },

    // ======================
    // Loyalty Program
    // ======================
    membershipTier: {
      type: String,
      enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
      default: 'Bronze'
    },

    coins: {
      type: Number,
      default: 0,
      min: 0
    },

    totalPurchases: {
      type: Number,
      default: 0
    },

    visitCount: {
      type: Number,
      default: 0
    },

    coinsEarned: {
      type: Number,
      default: 0
    },

    coinsRedeemed: {
      type: Number,
      default: 0
    },

    lastVisit: {
      type: Date,
      default: Date.now
    },

    joinDate: {
      type: Date,
      default: Date.now
    },

    totalOrders: {
      type: Number,
      default: 0
    },

    totalSpent: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// ===================================================
// INDEXES
// ===================================================
customerSchema.index({ phone: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ customerId: 1 });
customerSchema.index({ membershipTier: 1 });

// ===================================================
// SIMPLIFIED AUTO-GENERATE CUSTOMER ID (Mongoose 7 compatible)
// ===================================================
customerSchema.pre('save', async function () {
  if (this.customerId) return;

  try {
    // Find the last customer to get the highest number
    const lastCustomer = await this.constructor.findOne(
      { customerId: { $regex: /^CUST-/ } },
      { customerId: 1 },
      { sort: { customerId: -1 } }
    );

    let nextNumber = 1;
    if (lastCustomer && lastCustomer.customerId) {
      const match = lastCustomer.customerId.match(/CUST-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    this.customerId = `CUST-${String(nextNumber).padStart(4, '0')}`;
  } catch (error) {
    // If there's an error, fall back to timestamp-based ID
    console.error('Error generating customer ID:', error);
    this.customerId = `CUST-T${Date.now().toString().slice(-6)}`;
  }
});

// ===================================================
// AUTO MEMBERSHIP TIER (Mongoose 7 compatible)
// ===================================================
customerSchema.pre('save', function () {
  // Skip if totalPurchases hasn't changed
  if (!this.isModified('totalPurchases') && !this.isNew) return;

  if (this.totalPurchases >= 5000) {
    this.membershipTier = 'Platinum';
  } else if (this.totalPurchases >= 2000) {
    this.membershipTier = 'Gold';
  } else if (this.totalPurchases >= 500) {
    this.membershipTier = 'Silver';
  } else {
    this.membershipTier = 'Bronze';
  }
});

// ===================================================
// METHODS
// ===================================================
customerSchema.methods.getDiscountValue = function () {
  const rates = {
    Bronze: 0.5,
    Silver: 0.55,
    Gold: 0.6,
    Platinum: 0.65
  };

  return this.coins * rates[this.membershipTier];
};

customerSchema.methods.earnCoinsFromPurchase = function (amount) {
  const rates = {
    Bronze: 10,
    Silver: 11,
    Gold: 12,
    Platinum: 13
  };

  const earned = Math.floor((amount / 100) * rates[this.membershipTier]);

  this.coins += earned;
  this.coinsEarned += earned;
  this.totalPurchases += amount;
  this.totalSpent += amount;
  this.visitCount += 1;
  this.totalOrders += 1;
  this.lastVisit = Date.now();

  return earned;
};

customerSchema.methods.redeemCoins = function (coins) {
  if (coins > this.coins) {
    throw new Error('Insufficient coins');
  }

  this.coins -= coins;
  this.coinsRedeemed += coins;

  return this.coins;
};

module.exports = mongoose.model('Customer', customerSchema);