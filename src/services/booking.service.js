const axios = require('axios');
const db = require('../models');
const serverConfig = require('../config/server-config');
const { StatusCodes } = require('http-status-codes');

// data : {
//     userId
//     flightId
//     noOfSeats
// }

async function createBooking(data){
    return new Promise((res,rej)=>{
        const result = db.sequelize.transaction(async function bookingImp(t){
            const flight = await axios.get(`${serverConfig.FLIGHT_SERVICE_URL}/api/v1/flights/${data.flightId}`);
            const flightData=flight.data.data;

            if(data.noOfSeats > flightData.totalSeats){
                rej(new AppError('Not enough Seats available',StatusCodes.BAD_REQUEST));
            }

            res(true);
        });
    });
}

module.exports={
    createBooking
}