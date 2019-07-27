const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let AccountSchema = new Schema({
    _id: { type: Schema.ObjectId, auto: true },
    email: { type: String, required: true, max: 30, unique : true },
    password: { type: String, required: true },
    userName: { type: String, unique: true },
    accType: { type: String, max: 50 },
    createdBy: { type: Schema.ObjectId },
    image: { type: String }    //this will be the name of the image of stored file 
});

var Account = mongoose.model('AccountModel', AccountSchema);

// Export the model
module.exports = Account;