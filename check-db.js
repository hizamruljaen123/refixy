const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkDatabase() {
  try {
    // Check if users exist
    const users = await db.user.findMany();
    console.log('Users found:', users.length);
    
    if (users.length > 0) {
      console.log('First user:', {
        email: users[0].email,
        full_name: users[0].full_name,
        is_active: users[0].is_active
      });
    }
    
    // Check if roles exist
    const roles = await db.role.findMany();
    console.log('Roles found:', roles.length);
    
    // Check if permissions exist
    const permissions = await db.permission.findMany();
    console.log('Permissions found:', permissions.length);
    
    // Check if user_roles exist
    const userRoles = await db.userRole.findMany();
    console.log('User roles found:', userRoles.length);
    
  } catch (error) {
    console.error('Database check error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkDatabase();