const cron = require('node-cron');
const Banner = require('../models/bannerSchema');

cron.schedule('0 * * * *', async () => {          // every hour at :00
  try {
    const now = new Date();

    // Activate only those currently in range and not already active
    const activate = await Banner.updateMany(
      { isActive: { $ne: true }, startDate: { $lte: now }, endDate: { $gte: now } },
      { $set: { isActive: true } }
    );

    // Deactivate future banners (not started yet)
    const deactivateFuture = await Banner.updateMany(
      { isActive: { $ne: false }, startDate: { $gt: now } },
      { $set: { isActive: false } }
    );

    // Deactivate past banners (already ended)
    const deactivatePast = await Banner.updateMany(
      { isActive: { $ne: false }, endDate: { $lt: now } },
      { $set: { isActive: false } }
    );

    console.log(
      `[Cron] ${now.toISOString()} activated=${activate.modifiedCount} ` +
      `deact_future=${deactivateFuture.modifiedCount} deact_past=${deactivatePast.modifiedCount}`
    );
  } catch (err) {
    console.error('[Cron] Error updating banners:', err);
  }
}, {
  timezone: 'UTC'   // keep comparisons consistent if your server TZ varies
});
