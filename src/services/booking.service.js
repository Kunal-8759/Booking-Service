const axios = require('axios');
const db = require('../models');
const serverConfig = require('../config/server-config');
const { StatusCodes } = require('http-status-codes');
const AppError = require('../utils/Errors/app.error');

const {BookingRepository} = require('../repositories');

const bookingrepository = new BookingRepository();
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
        const booking =await bookingrepository.createBooking(bookingPayload,transaction);
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

module.exports={
    createBooking
}