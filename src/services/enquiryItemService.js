const moment = require('moment');
const XLSX = require('xlsx');

// Local Import
// const { leadDao } = require('../dao');
const { enquiryModel, enquiryItemModel } = require('../dbModel');
const { query } = require('../utils/mongodbQuery');
const { logger } = require('../utils/logger');

const LOG_ID = 'services/enquiryItemService';

/**
 * Creates a new enquiry item.
 *
 * @param {object} auth - Data of logedin user.
 * @param {object} enquiryItemData - Data for creating a new enquiry item.
 * @returns {object} - An object with the results, including the new enquiry item.
 */
exports.createEnquiryItem = async (auth, enquiryItemData) => {
    try {
        const { email, _id, fname, lname } = auth;

        const findenquiry = await query.findOne(enquiryModel, { _id: enquiryItemData.enquiryId, isActive: true, isDeleted: false });
        // console.log('findenquiry>>>>>>>>>>>>>', findenquiry);
        if (!findenquiry) {
            return {
                success: false,
                message: 'Enquiry not found.'
            };
        }

        const findUniqueName = await query.findOne(enquiryItemModel, { partNumber: enquiryItemData.partNumber, enquiryId: enquiryItemData.enquiryId });
        if (findUniqueName) {
            return {
                success: false,
                message: 'Enquiry item part number already exist.'
            };
        }
        let obj = {
            performedBy: _id,
            performedByEmail: email,
            actionName: `Enquiry item added by ${fname} ${lname} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}`
        };
        findenquiry.Activity.push(obj);
        enquiryItemData.createdBy = _id;
        enquiryItemData.partNumberCode = enquiryItemData.partNumber.replace(/[-/]/g, '').toLowerCase();
        const newenquiryItem = await query.create(enquiryItemModel, enquiryItemData);
        if (newenquiryItem) {
            await enquiryModel.updateOne({ _id: enquiryItemData.enquiryId }, { Activity: findenquiry.Activity, isItemAdded: true });
            return {
                success: true,
                message: 'Enquiry item added successfully.',
                data: newenquiryItem
            };
        }
    } catch (error) {
        logger.error(LOG_ID, `Error while adding enquiry item: ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};

/**
 * Updates a enquiry Item by ID.
 *
 * @param {string} auth - req.auth.
 * @param {string} _id - The ID of the enquiry Item be updated.
 * @param {string} body - Updated data for the enquiry Item.
 * @returns {object} - An object with the results, including updated enquiry Item.
 */
exports.updateEnquiryItemById = async (auth, _id, body) => {
    try {
        const findData = await query.findOne(enquiryItemModel, { _id, isDeleted: false });
        if (!findData) {
            return {
                success: false,
                message: 'Enquiry Item not found.'
            };
        }
        const findenquiry = await query.findOne(enquiryModel, { _id: findData.enquiryId, isActive: true, isDeleted: false });
        // console.log('findenquiry>>>>>>>>>>>>>', findenquiry);
        if (!findenquiry) {
            return {
                success: false,
                message: 'Enquiry not found.'
            };
        }
        if (body.partNumber) {
            const findUniqueName = await query.findOne(enquiryItemModel, { partNumber: body.partNumber, enquiryId: findenquiry.enquiryId });
            if (findUniqueName) {
                return {
                    success: false,
                    message: 'Enquiry item part number already exist.'
                };
            }
            body.partNumberCode = body.partNumber.replace(/[-/]/g, '').toLowerCase();
        }

        let obj = {
            performedBy: auth._id,
            performedByEmail: auth.email,
            actionName: `Enquiry item update by ${auth.fname} ${auth.lname} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}`
        };
        findenquiry.Activity.push(obj);
        body.updatedBy = auth._id;
        const data = await enquiryItemModel.findByIdAndUpdate(_id, body, { new: true, runValidators: true });
        if (data) {
            await enquiryModel.updateOne({ _id: findenquiry._id }, { Activity: findenquiry.Activity });
            return {
                success: true,
                message: 'Enquiry item updated successfully.',
                data
            };
        }
    } catch (error) {
        logger.error(LOG_ID, `Error updating enquiry item: ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};

/**
 * Deletes a enquiry item by ID.
 *
 * @param {string} auth - req.auth.
 * @param {string} _id - The ID of the enquiry item to be deleted.
 * @returns {object} - An object with the results.
 */
exports.delete = async (auth, _id) => {
    try {
        const findData = await query.findOne(enquiryItemModel, { _id, isDeleted: false });
        if (!findData) {
            return {
                success: false,
                message: 'Enquiry Item not found.'
            };
        }

        const findenquiry = await query.findOne(enquiryModel, { _id: findData.enquiryId, isActive: true, isDeleted: false });
        // console.log('findenquiry>>>>>>>>>>>>>', findenquiry);
        if (!findenquiry) {
            return {
                success: false,
                message: 'Enquiry not found.'
            };
        }
        const data = await enquiryItemModel.findByIdAndUpdate(_id, { isDeleted: true });
        if (!data) {
            return {
                success: false,
                message: 'Enquiry Item not found.'
            };
        }
        let obj = {
            performedBy: auth._id,
            performedByEmail: auth.email,
            actionName: `Enquiry item deleted by ${auth.fname} ${auth.lname} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}`
        };
        findenquiry.Activity.push(obj);
        await enquiryModel.updateOne({ _id: findenquiry._id }, { Activity: findenquiry.Activity });
        return {
            success: true,
            message: 'Enquiry item deleted successfully.'
        };
    } catch (error) {
        logger.error(LOG_ID, `Error deleting enquiry: ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};

/**
 * Bulk upload and insert multiple enquiry iteams.
 *
 * @param {object} auth - Data of logedin user.
 * @param {string} enquiryId - id of enquiry.
 * @param {string} path - path of uploaded file.
 * @returns {object} - An object with the results.
 */
exports.itemBulkUpload = async (auth, enquiryId, path) => {
    try {
        const { email, _id, fname, lname } = auth;
        const constData = ['partNumber', 'partDesc', 'hscode', 'unitPrice', 'delivery', 'notes'];
        const workbook = XLSX.readFile(path);
        const sheetNames = workbook.SheetNames;
        const worksheet = workbook.Sheets[sheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const documentsToSave = [];
        for (let i = 1; i < jsonData.length; i++) {
            let obj = { enquiryId, createdBy: _id };
            for (let j = 0; j < jsonData[i].length; j++) {
                if (!jsonData[i][j]) jsonData[i][j] = 'N/A';
                if (j == 0) {
                    obj['partNumberCode'] = `${jsonData[i][j]}`.replace(/[-/]/g, '').toLowerCase();
                }
                obj[constData[j]] = constData[j] == 'unitPrice' ? +jsonData[i][j] || 0 : jsonData[i][j];
            }
            documentsToSave.push(obj);
        }
        let data = await enquiryItemModel.insertMany(documentsToSave);
        if (data.length > 0) {
            let obj = {
                performedBy: _id,
                performedByEmail: email,
                actionName: `Enquiry item (bulk upload item quantity :- ${data.length}) added by ${fname} ${lname} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}`
            };
            await enquiryModel.updateOne({ _id: enquiryId }, { $push: { Activity: obj }, isItemAdded: true });
            return {
                success: true,
                message: 'Enquiry iteam bulk upload',
                data: data
            };
        }
        return {
            success: false,
            message: 'Error while enquiry iteam bulk upload',
            data: []
        };
    } catch (error) {
        logger.error(LOG_ID, `Error while uploading enquiry iteam in bulk: ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};