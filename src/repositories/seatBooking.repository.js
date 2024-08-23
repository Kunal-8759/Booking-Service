const CrudRepository = require("./crud.repository");
const {SeatBooking} = require('../models');

class SeatBookingRepository extends CrudRepository{
    constructor(){
        super(SeatBooking);
    }
    async createSeatBooking(data,transaction){
        const response = await SeatBooking.create(data,{transaction:transaction});
        return response;
    }

    async destroyUnpaidBooking(unpaidBookingId){
        const response = await SeatBooking.destroy({
            where : {
                bookingId : unpaidBookingId
            }
        });
        return response;
        
    }
}

module.exports=SeatBookingRepository;