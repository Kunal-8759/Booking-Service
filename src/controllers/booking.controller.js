const { StatusCodes } = require("http-status-codes");
const { BookingService } = require("../services");

async function createBooking(req,res){
    try {
        const response =await BookingService.createBooking(req.body);
        return res.status(StatusCodes.OK).json({
            success:true,
            message:"Booking done successfully",
            data:response,
            error:{}
        })
    } catch (error) {
        return res.status(error.statusCode).json({
            success:false,
            message:"something went wrong",
            data:{},
            error:error
        });
    }
}

async function makePayment(req,res){
    try {
        const response = await BookingService.makePayment(req.body);
        return res.status(StatusCodes.OK).json({
            success:true,
            message:"Payment done successfully",
            data:response,
            error:{}
        })
    } catch (error) {
        return res.status(error.statusCode).json({
            success:false,
            message:"something went wrong",
            data:{},
            error:error
        });
    }
}

module.exports={
    createBooking,
    makePayment
}