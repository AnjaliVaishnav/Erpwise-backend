const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EnquiryItemSchema = new Schema(
    {
        enquiryId: {
            type: mongoose.Types.ObjectId,
            ref: 'Enquiry'
        },
        partNumber: {
            type: String,
            required: true
        },
        partNumberCode: {
            type: String,
            required: true
        },
        partDesc: {
            type: String,
            required: true
        },
        unitPrice: {
            type: String,
            required: true
        },
        quantity: {
            type: String,
            required: true
        },
        delivery: {
            type: String,
            required: true
        },
        notes: {
            type: String,
            default: null
        },
        hscode: {
            type: String,
            required: true
        },
        createdBy: {
            type: mongoose.Types.ObjectId,
            ref: 'User'
        },
        updatedBy: {
            type: mongoose.Types.ObjectId,
            ref: 'User',
            default: null
        },
        enquirySupplierSelectedItemId: {
            type: mongoose.Types.ObjectId,
            ref: 'EnquirySupplierSelectedItem',
            default: null
        },
        isDeleted: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

module.exports = mongoose.model('EnquiryItem', EnquiryItemSchema);