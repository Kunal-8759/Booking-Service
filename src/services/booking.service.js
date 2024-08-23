const axios = require('axios');
const db = require('../models');
const serverConfig = require('../config/server-config');
const { StatusCodes } = require('http-status-codes');
const AppError = require('../utils/Errors/app.error');
const {BOOKING_STATUS} = require('../utils/common/enum')

const {BookingRepository} = require('../repositories');
const { Queue } = require('../config');

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
        //to check that user is present or not
        const user = await axios.get(`${serverConfig.API_GATEWAY_URL}/api/v1/user/${data.userId}`);

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
        if(error.name=='AxiosError'){
            throw new AppError('Either flight is not present or user is not signed In',StatusCodes.BAD_REQUEST);
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

        if(bookingDetails.status==BOOKING_STATUS.BOOKED){
            throw new AppError('Your ticket was Booked previously', StatusCodes.BAD_REQUEST);
        }

        const bookingTime = new Date(bookingDetails.createdAt);//whem booking has been initiated
        const currentTime = new Date();//current time is the time of the payment


        //if the booking status is confirmed once -->status :BOOKED
        //now by mistake the user try to book the ticket again 
        // 1.within the 5 minutes
        // 2.after the 5 minutes

        if(currentTime-bookingTime > 300000){//if payment try to  do after 5 minutes
            await cancelBooking(data.bookingId);
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

        Queue.sendData({
            recepientEmail : await getEmail(data.userId),
            subject : `Flight Booked for Booking Id ${data.bookingId}`,
            text : `Hey User
            
            Booking successfully done for the booking ${data.bookingId}`
        });
        await transaction.commit();

    } catch (error) {
        await transaction.commit();
        throw error;
    }
}

async function cancelBooking(bookingId){
    const transaction = await db.sequelize.transaction();
    try {
        const bookingDetails = await bookingRepository.get(bookingId,transaction);

        if(bookingDetails.status==BOOKING_STATUS.CANCELLED ){//phle se hi cancel hai wo bookingId
            await transaction.commit();
            return true;
        }

        //if the status is not cancelled then we have to update it to cancelled and increase the noOfseats in the flight it has been occupying
        await bookingRepository.update(bookingId,{status : BOOKING_STATUS.CANCELLED},transaction);
        await axios.patch(`${serverConfig.FLIGHT_SERVICE_URL}/api/v1/flights/${bookingDetails.flightId}/seats`,{
            seats : bookingDetails.noOfSeats,
            dec : 0
        });

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function cancelOldBookings(unpaidBookingId) {
    try {
        const response =await bookingRepository.cancelOldBookings(unpaidBookingId);
        return response;
    } catch (error) {
        console.log(error);
    }
}

async function getOldBooking(){
    try {
        const time =new Date(Date.now()- 1000*300); //time 5 mins ago
        const unpaidbookingId =await bookingRepository.getOldBooking(time);
        return unpaidbookingId;
    } catch (error) {
        console.log(error);
    }
}

async function getEmail(id){
    try {
        const user = await axios.get(`${serverConfig.API_GATEWAY_URL}/api/v1/user/${id}`);
        return user.data.data.email;
    } catch (error) {
        console.log(error);
    }
}


module.exports={
    createBooking,
    makePayment,
    cancelOldBookings,
    getOldBooking
}

