const cron = require("node-cron");

const User = require("../models/User");

cron.schedule("0 0 * * *", async () => {
  console.log("Running daily biometric data cleanup...");

  try {
    const result = await User.updateMany(
      {
        faceDescriptor: { $exists: true, $ne: [] },
        faceExpiresAt: { $lte: new Date() }
      },
      {
        $set: {
          faceDescriptor: [],
          consentGiven: false,
          faceRegisteredAt: null,
          faceExpiresAt: null
        }
      }
    );

    console.log(`Cleanup complete. Removed data from ${result.modifiedCount} users.`);
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
});
