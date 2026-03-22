require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const forceResetParents = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const collection = mongoose.connection.db.collection('users');
    
    // Find all parents
    const parents = await collection.find({ role: 'parent' }).toArray();
    console.log(`👨‍👩‍👧 Found ${parents.length} parents\n`);

    let updated = 0;
    const password = 'password1234';
    
    // Create a new hash for the password
    const newHash = await bcrypt.hash(password, 10);
    console.log(`🔑 New hash for "${password}":`);
    console.log(`${newHash}\n`);

    // Update all parents with the new hash
    for (const parent of parents) {
      await collection.updateOne(
        { _id: parent._id },
        { 
          $set: { 
            password: newHash,
            updatedAt: new Date()
          } 
        }
      );
      console.log(`✅ Updated: ${parent.email}`);
      updated++;
    }

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total parents: ${parents.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Password: ${password}`);
    
    // Verify the update worked
    console.log(`\n🔍 VERIFICATION:`);
    const verifyParent = await collection.findOne({ email: 'parent1@demo.com' });
    const isValid = await bcrypt.compare(password, verifyParent.password);
    
    console.log(`   parent1@demo.com:`);
    console.log(`   Old hash: ${verifyParent.password === newHash ? '✅ Updated' : '⚠️ Different'}`);
    console.log(`   Password check: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    
    if (isValid) {
      console.log(`\n🎉 SUCCESS! All parents now have password: ${password}`);
    } else {
      console.log(`\n⚠️ WARNING: Password verification failed!`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Done');
  }
};

forceResetParents();