const cron = require('node-cron');

const { BookingService } = require('../../services');

function scheduleCrons() {
    cron.schedule('*/30 * * * *', async () => {//the cron job will run after every 30 min
        await BookingService.cancelOldBookings();
    });
}

module.exports = scheduleCrons;