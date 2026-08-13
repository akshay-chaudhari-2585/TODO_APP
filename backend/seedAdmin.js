import db from './src/config/db.js';
import bcrypt from 'bcrypt';

const seedAdmin = async () => {
  try {
    const adminEmail = 'admin@gmail.com';
    const existingAdmin = await db.users.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash('Admin@123', 10);
    
    await db.users.create({
      data: {
        email: adminEmail,
        password_hash: passwordHash,
        first_name: 'Super',
        last_name: 'Admin',
        role: 'ADMIN',
        is_active: true
      }
    });

    console.log('Successfully created admin user: admin@gmail.com / Admin@123');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1);
  }
};

seedAdmin();
