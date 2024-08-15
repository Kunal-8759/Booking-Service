const express=require('express');
const { BookingController } = require('../../controllers');
const { BookingMiddleware } = require('../../middlewares');

const bookingRouter=express.Router();

// api/v1/bookings POST
bookingRouter.post('/',BookingMiddleware.validateCreateBookingRequest,BookingController.createBooking);

module.exports=bookingRouter;