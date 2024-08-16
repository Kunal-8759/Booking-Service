const { StatusCodes } = require("http-status-codes");
const AppError = require("../utils/Errors/app.error");

function validateCreateBookingRequest(req,res,next){
    if(!req.body.userId){
        
        return res.status(StatusCodes.BAD_REQUEST).json({
            sucess:false,
            message:"something went wrong while creating Booking",
            error:new AppError('userId not found in the incoming request in the Correct Form',StatusCodes.BAD_REQUEST),
            data:{}
        })
    }
    if(!req.body.flightId){
        
        return res.status(StatusCodes.BAD_REQUEST).json({
            sucess:false,
            message:"something went wrong while creating Booking",
            error:new AppError('flightId not found in the incoming request in the Correct Form',StatusCodes.BAD_REQUEST),
            data:{}
        })
    }
    if(!req.body.noOfSeats){
        
        return res.status(StatusCodes.BAD_REQUEST).json({
            sucess:false,
            message:"something went wrong while creating Booking",
            error:new AppError('noOfSeats not found in the incoming request in the Correct Form',StatusCodes.BAD_REQUEST),
            data:{}
        })
    }
    next();
}

module.exports={
    validateCreateBookingRequest
}
