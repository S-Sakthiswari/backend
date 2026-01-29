// server.js - FIXED VERSION

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/productRoutes');
const customerRoutes = require('./routes/customerRoutes');
const discountRoutes = require('./routes/discountRoutes');
const couponRoutes = require('./routes/couponRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const taxRoutes = require('./routes/taxRoutes');
const coinRoutes = require('./routes/coinRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const whatsappRoutes = require('./routes/Whatsapp');
const ordersRoutes = require('./routes/orders');
const billsRoutes = require('./routes/bills');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));





app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ============================================================================
// MONGODB ATLAS CONNECTION - FIXED OPTIONS
// ============================================================================
const connectToDatabase = async () => {
  try {
    let connectionString;

    // Check if Atlas connection string is provided in environment
    if (process.env.MONGODB_ATLAS_URI) {
      connectionString = process.env.MONGODB_ATLAS_URI;
      console.log('🌐 Using MongoDB Atlas connection');
    } else if (process.env.MONGODB_URI) {
      connectionString = process.env.MONGODB_URI;
      console.log('📦 Using MongoDB connection from MONGODB_URI');
    } else {
      // Fallback to local MongoDB
      connectionString = 'mongodb://127.0.0.1:27017/billing-system';
      console.log('💻 Using local MongoDB connection');
    }

    // For Mongoose 6+, these options are no longer needed (they're default/removed)
    // Remove useNewUrlParser, useUnifiedTopology, etc.
    const mongooseOptions = {
      // No need for useNewUrlParser, useUnifiedTopology in Mongoose 6+
      serverSelectionTimeoutMS: 10000, // Increased to 10 seconds
      socketTimeoutMS: 45000,
      family: 4,
    };

    console.log('🔄 Connecting to MongoDB...');

    await mongoose.connect(connectionString, mongooseOptions);

    console.log('✅ MongoDB connected successfully!');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`🏠 Host: ${mongoose.connection.host}`);

    // Auto-create default users if they don't exist
    await createDefaultUsers();

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Full error:', error);

    // Provide helpful error messages for common issues
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n🔧 Troubleshooting tips:');
      console.log('1. Check your internet connection');
      console.log('2. Verify your MongoDB Atlas IP whitelist settings');
    } else if (error.message.includes('Authentication failed')) {
      console.log('\n🔧 Troubleshooting tips:');
      console.log('1. Verify your MongoDB Atlas username and password');
      console.log('2. Check if your user has the correct database permissions');
    }

    process.exit(1);
  }
};

// Initialize database connection
connectToDatabase();

// ============================================================================
// AUTO-CREATE DEFAULT USERS FUNCTION
// ============================================================================
async function createDefaultUsers() {
  try {
    const User = require('./models/User');

    console.log('🔍 Checking for existing users...');

    // Check total user count
    const totalUsers = await User.countDocuments();
    console.log(`Total users in database: ${totalUsers}`);

    // Check if admin exists
    const adminExists = await User.findOne({ username: 'admin', role: 'admin' });
    if (!adminExists) {
      console.log('👤 Creating admin user...');
      const hashedAdminPassword = await bcrypt.hash('admin123', 10);
      const admin = await User.create({
        username: 'admin',
        password: hashedAdminPassword,
        role: 'admin'
      });
      console.log('✅ Admin user created successfully');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   ID:', admin._id);
    } else {
      console.log('ℹ️  Admin user already exists (ID:', adminExists._id + ')');
    }

    // Check if staff exists
    const staffExists = await User.findOne({ username: 'staff', role: 'staff' });
    if (!staffExists) {
      console.log('👤 Creating staff user...');
      const hashedStaffPassword = await bcrypt.hash('staff123', 10);
      const staff = await User.create({
        username: 'staff',
        password: hashedStaffPassword,
        role: 'staff'
      });
      console.log('✅ Staff user created successfully');
      console.log('   Username: staff');
      console.log('   Password: staff123');
      console.log('   ID:', staff._id);
    } else {
      console.log('ℹ️  Staff user already exists (ID:', staffExists._id + ')');
    }

    // Verify final count
    const finalCount = await User.countDocuments();
    console.log(`\n✅ User setup complete. Total users: ${finalCount}`);

  } catch (error) {
    console.error('❌ Error creating default users:', error.message);
    console.error('Full error:', error);
  }
}

// Base route
app.get('/', (req, res) => {
  res.json({
    message: 'Backend is running',
    version: '2.0.0',
    features: ['Customer Management', 'Coin Wallet System', 'Transaction History', 'Invoice System', 'Real-time Notifications'],
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      customers: '/api/customers',
      notifications: '/api/notifications',
      sales: '/api/sales',
      analytics: '/api/analytics'
    }
  });
});

// Core routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/coins', coinRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/notifications', notificationRoutes);

// Load other routes safely
const loadRoutes = (routePath, routeName) => {
  try {
    const routes = require(routePath);
    app.use(`/api/${routeName}`, routes);
    console.log(`✅ ${routeName} routes loaded`);
  } catch (err) {
    console.warn(`⚠️ ${routeName} routes not found:`, err.message);
    // Create placeholder route
    const router = express.Router();
    router.get('/', (req, res) => res.json({ message: `${routeName} module not implemented` }));
    app.use(`/api/${routeName}`, router);
  }
};

// Load optional routes
loadRoutes('./routes/invoice', 'invoices');
loadRoutes('./routes/sales', 'sales');
loadRoutes('./routes/analytics', 'analytics');

// Import Notification model for socket events
const Notification = require('./models/Notification');

// ============================================================================
// UPSERT NOTIFICATION FUNCTION - Prevents Duplicate Notifications
// ============================================================================
async function upsertNotification(notificationData) {
  try {
    const {
      type,
      title,
      message,
      productName,
      productId,
      currentStock,
      minStock,
      priority = 'medium',
      color = 'blue',
      icon = 'Bell',
      timestamp = new Date(),
      isRead = false
    } = notificationData;

    // Create a query to find similar notifications
    const query = {
      type,
      productId,
      isRead: false // Only check unread notifications
    };

    // Check if a similar notification already exists
    let existingNotification = await Notification.findOne(query);

    if (existingNotification) {
      // Update existing notification with new data
      existingNotification.title = title;
      existingNotification.message = message;
      existingNotification.currentStock = currentStock;
      existingNotification.minStock = minStock;
      existingNotification.priority = priority;
      existingNotification.color = color;
      existingNotification.timestamp = timestamp;

      await existingNotification.save();

      console.log('✅ Updated existing notification:', existingNotification._id);
      return {
        notification: existingNotification,
        isNew: false
      };
    } else {
      // Create new notification
      const newNotification = await Notification.create({
        type,
        title,
        message,
        productName,
        productId,
        currentStock,
        minStock,
        priority,
        color,
        icon,
        timestamp,
        isRead
      });

      console.log('✅ Created new notification:', newNotification._id);
      return {
        notification: newNotification,
        isNew: true
      };
    }
  } catch (error) {
    console.error('❌ Error in upsertNotification:', error);
    throw error;
  }
}

// Socket.io events
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('joinNotificationRoom', () => {
    socket.join('notifications');
    console.log(`Client ${socket.id} joined notification room`);
  });

  // Handle stock updates from Stock Management page
  socket.on('stock_updated', async (data) => {
    console.log('📦 Stock update received:', data);

    try {
      const notificationData = {
        type: data.currentStock === 0 ? 'Out of Stock' : 'Low Stock',
        title: data.currentStock === 0 ? 'Out of Stock Alert' : 'Low Stock Alert',
        message: data.currentStock === 0
          ? `${data.productName} is out of stock`
          : `${data.productName} stock is low (${data.currentStock} units remaining)`,
        productName: data.productName,
        productId: data.productId,
        currentStock: data.currentStock,
        minStock: data.minStock,
        priority: data.currentStock === 0 ? 'high' : data.currentStock <= 2 ? 'high' : 'medium',
        color: data.currentStock === 0 ? 'red' : 'orange',
        icon: 'Package'
      };

      // Use upsert to prevent duplicates
      const result = await upsertNotification(notificationData);

      // Emit to all clients in notification room
      io.to('notifications').emit('new_notification', result.notification);
      console.log(`📢 ${result.isNew ? 'Created new' : 'Updated existing'} stock notification: ${result.notification.title}`);
    } catch (error) {
      console.error('Error saving stock notification:', error);
    }
  });

  // Handle direct notifications from client
  socket.on('new_notification', async (notificationData) => {
    console.log('📢 Direct notification from client:', notificationData.title || notificationData.message);

    try {
      // Remove any custom _id and let MongoDB generate it
      const { _id, ...cleanNotificationData } = notificationData;

      // Use upsert to prevent duplicates
      const result = await upsertNotification({
        ...cleanNotificationData,
        timestamp: notificationData.timestamp || new Date(),
        isRead: notificationData.isRead || false
      });

      // Broadcast to all clients
      io.emit('new_notification', result.notification);
      console.log(`📢 ${result.isNew ? 'Created new' : 'Updated existing'} notification: ${result.notification.title}`);
    } catch (error) {
      console.error('Error saving direct notification:', error);
    }
  });

  // Handle marking notifications as read
  socket.on('mark_notification_read', async (notificationId) => {
    try {
      await Notification.findByIdAndUpdate(notificationId, { isRead: true });
      io.emit('notification_read', { id: notificationId });
      console.log(`✅ Notification marked as read: ${notificationId}`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  });

  // Handle marking all notifications as read
  socket.on('mark_all_read', async () => {
    try {
      await Notification.updateMany({ isRead: false }, { isRead: true });
      io.emit('all_notifications_read');
      console.log('✅ All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  });

  // Handle deleting a notification
  socket.on('delete_notification', async (notificationId) => {
    try {
      await Notification.findByIdAndDelete(notificationId);
      io.emit('notification_deleted', { id: notificationId });
      console.log(`✅ Notification deleted: ${notificationId}`);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Database health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const statusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: {
      status: statusMap[dbStatus] || 'unknown',
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      readyState: dbStatus
    },
    uptime: process.uptime()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🔔 Real-time Notifications: ws://localhost:${PORT}`);
  console.log(`📦 Stock Monitoring: http://localhost:${PORT}/api/notifications/check-stock`);
  console.log(`✅ Duplicate notification prevention: ACTIVE`);
  console.log(`👤 Default users will be created if they don't exist`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});
