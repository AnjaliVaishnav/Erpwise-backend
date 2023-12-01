const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * @typedef {object} Lead
 * @property {string} companyName - The name of the lead's company.
 * @property {string} leadId - The unique identifier for the lead.
 * @property {string} email - The email address of the lead (must be unique).
 * @property {string} phone - The phone number of the lead (must be unique).
 * @property {mongoose.Types.ObjectId} salesPerson - The ID of the salesperson (referenced from 'User' model).
 * @property {string} address - The main address information for the lead.
 * @property {string} note - Additional notes or comments about the lead.
 * @property {mongoose.Types.ObjectId} currency - The ID of the currency (referenced from 'Currency' model).
 * @property {Date} dueDate - The due date associated with the lead.
 * @property {Array} documents - An array of documents associated with the lead.
 * @property {boolean} isQualified - Indicates whether the lead is qualifiyed or not.
 * @property {boolean} isActive - Indicates whether the lead is active.
 * @property {Date} createdAt - The timestamp when the document was created.
 * @property {Date} updatedAt - The timestamp when the document was last updated.
 */

/**
 * Mongoose schema for lead.
 * 
 * @type {mongoose.Schema<Lead>}
 */
const leadSchema = new Schema(
    {
        companyName: {
            type: String,
            required: true,
            unique: true
        },
        Id: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        phone: {
            type: String,
            required: true,
            unique: true
        },
        salesPerson: {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        address: {
            type: String,
            required: true
        },
        note: {
            type: String,
            required: true
        },
        currency: {
            type: mongoose.Types.ObjectId,
            required: true,
            ref: 'Currency'
        },
        dueDate: {
            type: Date,
            required: true
        },
        documents: {
            type: Array
        },
        isQualified:{
            type: Boolean,
            default: false
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

module.exports = mongoose.model('Lead', leadSchema);