// seedAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/userSchema'); // Update path if different

const seedAdmin = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/yourDatabaseName'); // Change your DB name

    const existingAdmin = await User.findOne({ email: 'admin@example.com' });

    if (existingAdmin) {
      console.log('⚠️ Admin already exists');
    } else {
      const hashedPassword = await bcrypt.hash('admin1234', 10);
      const admin = new User({
        name: 'Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        isAdmin: true
      });

      await admin.save();
      console.log('✅ Admin created successfully');
    }

    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Seeder error:', err);
  }
};

seedAdmin();
