const axios = require('axios');
const db = require('../models');
const serverConfig = require('../config/server-config');
const { StatusCodes } = require('http-status-codes');
const AppError = require('../utils/Errors/app.error');
const {BOOKING_STATUS} = require('../utils/common/enum')

const {BookingRepository} = require('../repositories');

const bookingRepository = new BookingRepository();
// data : {
//     userId
//     flightId
//     noOfSeats
// }


async function createBooking(data){
    //unmanaged transaction
    const transaction = await db.sequelize.transaction();
    try {
        const flight = await axios.get(`${serverConfig.FLIGHT_SERVICE_URL}/api/v1/flights/${data.flightId}`);
        const flightData=flight.data.data;

        if(data.noOfSeats > flightData.totalSeats){
            throw new AppError('Not enough Seats available',StatusCodes.BAD_REQUEST);
        }

        const totalBillingAmount = data.noOfSeats * flightData.price;
        const bookingPayload={
            flightId:data.flightId,
            userId:data.userId,
            noOfSeats:data.noOfSeats,
            totalCost:totalBillingAmount
        }
        //create the booking with the initiated State Status
        const booking =await bookingRepository.createBooking(bookingPayload,transaction);
        //will decrease the no of seats avavilable in the flight
        const response=await axios.patch(`${serverConfig.FLIGHT_SERVICE_URL}/api/v1/flights/${data.flightId}/seats`,{
            seats:data.noOfSeats,
            dec:1
        });

        await transaction.commit();
        return booking;

    } catch (error) {
        await transaction.rollback();
        if(error.message=='Not enough Seats available'){
            throw new AppError('Not enough Seats available',StatusCodes.BAD_REQUEST);
        }
        throw new AppError(`something went wrong while creating Booking`,StatusCodes.INTERNAL_SERVER_ERROR);
    }
}


// data : {
    // bookingId,
    // userId,
    // totalCost
// }
async function makePayment(data){
    const transaction = await db.sequelize.transaction();
    try {
        const bookingDetails = await bookingRepository.get(data.bookingId,transaction);

        if(bookingDetails.status==BOOKING_STATUS.CANCELLED){
            throw new AppError('The booking has expired', StatusCodes.BAD_REQUEST);
        }

        const bookingTime = new Date(bookingDetails.createdAt);//whem booking has been initiated
        const currentTime = new Date();//current time is the time of the payment

        if(currentTime-bookingTime > 300000 && bookingDetails.status==BOOKING_STATUS.INITIATED){//if payment try to do in more than 5 minutes
            await bookingRepository.update(data.bookingId, {status:BOOKING_STATUS.CANCELLED}, transaction);
            throw new AppError('The booking has expired', StatusCodes.BAD_REQUEST);
        }

        if(bookingDetails.totalCost != data.totalCost){
            throw new AppError('The amount of the payment doesnt match', StatusCodes.BAD_REQUEST);
        }

        if(bookingDetails.userId != data.userId) {
            throw new AppError('The user corresponding to the booking doesnt match', StatusCodes.BAD_REQUEST);
        }

        // we assume here that payment is successful
        await bookingRepository.update(data.bookingId, {status: BOOKING_STATUS.BOOKED}, transaction);
        await transaction.commit();

    } catch (error) {
        await transaction.commit();
        throw error;
    }
}

module.exports={
    createBooking,
    makePayment
}