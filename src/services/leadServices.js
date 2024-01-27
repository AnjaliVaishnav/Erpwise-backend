const moment = require('moment');
// Local Import
const { leadModel, enquiryModel, userModel } = require('../dbModel');
const { CRMlevelEnum, CRMlevelValueByKey, crmPipelineLevel } = require('../../config/default.json');
const { leadDao } = require('../dao');
const { query } = require('../utils/mongodbQuery');
const { logger } = require('../utils/logger');
const { generateId } = require('../utils/generateId');

const LOG_ID = 'services/leadService';

/**
 * Creates a new lead.
 *
 * @param {object} auth - Data of logedin user.
 * @param {object} leadData - Data for creating a new lead.
 * @param {string} orgId - Id of logedin user organisation.
 * @returns {object} - An object with the results, including the new lead.
 */
exports.createLead = async (auth, leadData, orgId) => {
    try {
        if (!orgId) {
            return {
                success: false,
                message: 'Organisation not found.'
            };
        }
        const findUser = await query.findOne(userModel, { _id: leadData.salesPerson, isActive: true });
        if (!findUser) {
            return {
                success: false,
                message: 'Sales person not found.'
            };
        }
        const findUniqueCompanyName = await query.findOne(leadModel, { organisationId: orgId, companyName: leadData.companyName });
        if (findUniqueCompanyName) {
            return {
                success: false,
                message: 'Company name already exist.'
            };
        }
        const { email, _id } = auth;
        let obj = {
            performedBy: _id,
            performedByEmail: email,
            actionName: `Lead creation by ${auth.fname} ${auth.lname} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}`
        };
        leadData.Activity = [obj];
        leadData.createdBy = _id;
        leadData.updatedBy = _id;
        leadData.organisationId = orgId;
        leadData.level = CRMlevelEnum.LEAD;
        leadData.Id = generateId('LI');
        leadData.salesPersonName = `${findUser.fname} ${findUser.lname}`;
        const newLead = await query.create(leadModel, leadData);
        return {
            success: true,
            message: 'Lead created successfully.',
            data: newLead
        };
    } catch (error) {
        logger.error(LOG_ID, `Error creating lead: ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};

/**
 * Gets all Lead.
 *
 * @param {string} orgId - Id of logedin user organisation.
 * @param {object} queryObj - filters for getting all leads.
 * @returns {object} - An object with the results, including all Lead.
 */
exports.getAllLead = async (orgId, queryObj) => {
    try {
        if (!orgId) {
            return {
                success: false,
                message: 'Organisation not found.'
            };
        }
        const { isActive, page = 1, perPage = 10, sortBy, sortOrder, level, id, search, salesPerson } = queryObj;
        if (level) {
            if (!CRMlevelValueByKey[level]) {
                return {
                    success: false,
                    message: 'Please provied a vaild crm level.'
                };
            }
        }
        // let obj = {
        //     organisationId: orgId,
        //     level: level ? +level : 1,
        //     isDeleted: false
        // };
        // if (isActive) obj['isActive'] = isActive === 'true' ? true : false;
        // if (id) obj['_id'] = id;
        // if (salesPerson) {
        //     obj['salesPerson'] = salesPerson;
        // }

        // if (search) {
        //     obj['$or'] = [
        //         { Id: { $regex: `${search}.*`, $options: 'i' } },
        //         { companyName: { $regex: `${search}.*`, $options: 'i' } },
        //         { address: { $regex: `${search}.*`, $options: 'i' } },
        //         { salesPersonName: { $regex: `${search}.*`, $options: 'i' } }
        //     ];
        // }
        // const leadListCount = await query.find(leadModel, obj, { _id: 1 });
        const leadData = await query.aggregation(leadModel, leadDao.getAllLeadPipeline(orgId, { isActive, page: +page, perPage: +perPage, sortBy, sortOrder, level, leadId: id, search, salesPerson }));
        const totalPages = Math.ceil(leadData.length / perPage);
        const messageName = CRMlevelValueByKey[level ? level : '1'];
        const formattedString = messageName.charAt(0).toUpperCase() + messageName.slice(1).toLowerCase();
        return {
            success: true,
            message: `${formattedString} fetched successfully.`,
            data: {
                leadData,
                pagination: {
                    page,
                    perPage,
                    totalChildrenCount: leadData.length,
                    totalPages
                }
            }
        };
    } catch (error) {
        logger.error(LOG_ID, `Error fetching lead: ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};

/**
 * Updates a Lead by ID.
 *
 * @param {object} auth -The is contain is auth user .
 * @param {string} leadId - The ID of the Lead to be updated.
 * @param {object} updatedData - Updated data for the Lead.
 * @param {object} orgId - contain organisation id .
 * @returns {object} - An object with the results, including the updated Lead.
 */
exports.updateLeadById = async (auth, leadId, updatedData, orgId) => {
    try {
        if (!orgId) {
            return {
                success: false,
                message: 'Organisation not found.'
            };
        }
        const data = await query.findOne(leadModel, { _id: leadId, isDeleted: false });
        if (!data) {
            return {
                success: false,
                message: 'Lead not found.'
            };
        }
        if (updatedData.companyName) {
            const findUniqueCompanyName = await query.findOne(leadModel, { organisationId: orgId, companyName: updatedData.companyName, _id: { $ne: leadId } });
            if (findUniqueCompanyName) {
                return {
                    success: false,
                    message: 'Company name already exist.'
                };
            }
        }
        let obj = {
            performedBy: auth._id,
            performedByEmail: auth.email,
            actionName: `Lead updated by ${auth.fname} ${auth.lname} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}`
        };
        updatedData['$push'] = { Activity: obj };
        updatedData.updatedBy = auth._id;
        if (updatedData?.qualifymeta && Object.keys(updatedData.qualifymeta).length == 12) updatedData.isQualified = true;
        const updatedLead = await leadModel.findByIdAndUpdate(
            leadId,
            updatedData,
            { new: true, runValidators: true }
        );

        return {
            success: true,
            message: 'Lead updated successfully.',
            data: updatedLead
        };
    } catch (error) {
        logger.error(LOG_ID, `Error updating Lead: ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};

/**
 * Delete a Lead by ID.
 *
 * @param {string} leadId - The ID of the Lead to be deleted.
 * @param {object} auth -The is contain is auth user .
 * @returns {object} - An object with the results, including the deleted Lead.
 */
exports.delete = async (leadId, auth) => {
    try {
        const data = await query.findOne(leadModel, { _id: leadId, isDeleted: false });
        if (!data) {
            return {
                success: false,
                message: 'Lead not found.'
            };
        }
        const findData = await query.find(enquiryModel, { leadId, isDeleted: false });
        if (findData.length > 0) {
            return {
                success: false,
                message: 'This lead cannot be deleted due to its association with an active enquiry.'
            };
        }
        // let arr = [];

        // if (data.isContactAdded) {
        //     arr.push(leadContactModel.deleteMany({ leadId }));
        // }
        // if (data.isAddressAdded) {
        //     arr.push(leadAddressModel.deleteMany({ leadId }));
        // }
        // arr.push(leadModel.findByIdAndDelete(leadId));
        // await Promise.all(arr);
        let updatedData = { isDeleted: true };
        let obj = {
            performedBy: auth._id,
            performedByEmail: auth.email,
            actionName: `Lead deleted by ${auth.fname} ${auth.lname} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}`
        };
        updatedData['$push'] = { Activity: obj };
        const deleteLead = await leadModel.findByIdAndUpdate(
            leadId,
            updatedData
        );
        if (deleteLead) {
            return {
                success: true,
                message: 'Lead deleted successfully.'
            };
        }
    } catch (error) {
        logger.error(LOG_ID, `Error deleting lead: ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};

/**
 * Qualify a Lead by ID.
 *
 * @param {string} auth -The is contain is auth user .
 * @param {string} leadId - The ID of the Lead to be updated.
 * @param {object} updateData - Updated data for the Lead (qualifymeta).
 * @param {object} orgId - contain organisation id .
 * @returns {object} - An object with the results, including the updated Lead (qualified).
 */
exports.qualifyLeadById = async (auth, leadId, updateData, orgId) => {
    try {
        if (!orgId) {
            return {
                success: false,
                message: 'Organisation not found.'
            };
        }
        const data = await query.findOne(leadModel, { _id: leadId, isDeleted: false });
        if (!data) {
            return {
                success: false,
                message: 'Lead not found.'
            };
        }

        if (!data.isContactAdded && !data.isQualified) {
            return {
                success: false,
                message: 'Lead contact not added.'
            };
        }
        let obj = {
            performedBy: auth._id,
            performedByEmail: auth.email,
            actionName: !data.isQualified ? `Lead qualified (moved to prospect) by ${auth.fname} ${auth.lname} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}` : `Lead prospect qualifymeta added by ${auth.fname} ${auth.lname} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}`
        };
        // leadData.updatedBy = _id;
        let updatedData = { qualifymeta: updateData, level: CRMlevelEnum.PROSPECT, isQualified: true };
        updatedData['$push'] = { Activity: obj };
        const updatedLead = await leadModel.findByIdAndUpdate(
            leadId,
            updatedData,
            { new: true, runValidators: true }
        );

        return {
            success: true,
            message: !data.isQualified ? 'Lead qualified successfully.' : 'Lead prospect qualifymeta added successfully.',
            data: updatedLead
        };
    } catch (error) {
        logger.error(LOG_ID, `Error while qualifying Lead: ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};


/**
 * Creates a new lead Prospect.
 *
 * @param {object} auth - Data of logedin user.
 * @param {object} prospectData - Data for creating a new lead.
 * @param {string} orgId - Id of logedin user organisation.
 * @returns {object} - An object with the results, including the new lead Prospect.
 */
exports.createProspect = async (auth, prospectData, orgId) => {
    try {
        if (!orgId) {
            return {
                success: false,
                message: 'Organisation not found.'
            };
        }
        const findUniqueCompanyName = await query.findOne(leadModel, { organisationId: orgId, companyName: prospectData.companyName });
        if (findUniqueCompanyName) {
            return {
                success: false,
                message: 'Company name already exist.'
            };
        }
        const { email, _id, fname, lname } = auth;
        let obj = {
            performedBy: _id,
            performedByEmail: email,
            actionName: `Lead prospect creation by ${fname} ${lname} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}`
        };
        prospectData.Activity = [obj];
        prospectData.createdBy = _id;
        prospectData.updatedBy = _id;
        prospectData.organisationId = orgId;
        prospectData.level = CRMlevelEnum.PROSPECT;
        prospectData.Id = generateId('LI');
        // if (Object.keys(prospectData.qualifymeta).length > 2) prospectData.isQualified = true;
        prospectData.qualifymeta.interest = 'LOW';
        const newLead = await query.create(leadModel, prospectData);
        return {
            success: true,
            message: 'Lead prospect created successfully.',
            data: newLead
        };
    } catch (error) {
        logger.error(LOG_ID, `Error creating lead: ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};

/**
 * Create/Updating lead finance.
 *
 * @param {object} auth - Data of logedin user.
 * @param {object} financeData - Data for adding a lead finance.
 * @param {string} leadId - Id of lead.
 * @param {string} orgId - Id of logedin user organisation.
 * @returns {object} - An object with the results, including the new lead data.
 */
exports.addLeadFinance = async (auth, financeData, leadId, orgId) => {
    try {
        const findLead = await query.findOne(leadModel, { _id: leadId, organisationId: orgId, isDeleted: false });
        if (!findLead) {
            return {
                success: false,
                message: 'Lead not found.'
            };
        }
        const { fname, email, _id, lname } = auth;
        if (findLead.isFinanceAdded) {
            financeData.createdBy = findLead.financeMeta.createdBy || _id;
            financeData.updatedBy = _id;

        } else financeData.createdBy = _id;
        let obj = {
            performedBy: _id,
            performedByEmail: email,
            actionName: findLead.isFinanceAdded ? `Lead finance updated by ${fname} ${lname} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}.` : `Lead finance added by ${fname} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}.`
        };
        let updatedData = { isFinanceAdded: true, financeMeta: financeData, updatedBy: _id };
        updatedData['$push'] = { Activity: obj };
        const updatedLeadFinance = await leadModel.findByIdAndUpdate(
            leadId,
            updatedData,
            { new: true, runValidators: true }
        );

        if (updatedLeadFinance) {
            return {
                success: true,
                message: findLead.isFinanceAdded ? 'Lead finance updated successfully.' : 'Lead finance added successfully.',
                data: updatedLeadFinance
            };
        }
    } catch (error) {
        logger.error(LOG_ID, `Error adding lead finance: ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};

/**
 * Upload Lead Document.
 *
 * @param {string} leadId - The ID of the lead.
 * @param {object} file - Parameters containing 'file details'.
 * @param {string} file.location - Parameters containing 'file location'.
 * @param {object} auth - req auth.
 * @returns {object} - An object with the results, including lead details.
 */
exports.uploadLeadDocument = async (leadId, { location }, auth) => {
    try {
        let obj = {
            performedBy: auth._id,
            performedByEmail: auth.email,
            actionName: `Lead document uploaded by ${auth.fname} ${auth.lname} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}`
        };
        const findAndUpdateLeadDocument = await leadModel.findOneAndUpdate({ _id: leadId, isDeleted: false }, { $push: { documents: location, Activity: obj }, updatedBy: auth._id }, { new: true });

        if (!findAndUpdateLeadDocument) {
            return {
                success: false,
                message: 'Error while uploading lead document.'
            };
        }

        return {
            success: true,
            message: `Document uploaded successfully.`,
            data: findAndUpdateLeadDocument
        };
    } catch (error) {
        logger.error(LOG_ID, `Error occurred during fetching uploading lead document (uploadLeadDocument): ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};

/**
 * delete Lead Document.
 *
 * @param {string} leadId - The ID of the lead.
 * @param {string} imageUrl - Parameters containing 'file details'.
 * @param {object} auth - req auth.
 * @returns {object} - An object with the results, including lead details.
 */
exports.deleteLeadDocument = async (leadId, imageUrl, auth) => {
    try {
        let obj = {
            performedBy: auth._id,
            performedByEmail: auth.email,
            actionName: `Lead document deleted by ${auth.fname} ${auth.lname} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}`
        };
        const findAndUpdateLeadDocument = await leadModel.findOneAndUpdate({ _id: leadId, isDeleted: false }, { $pull: { documents: imageUrl }, $push: { Activity: obj } }, { new: true });

        if (!findAndUpdateLeadDocument) {
            return {
                success: false,
                message: 'Error while deleting lead document.'
            };
        }

        return {
            success: true,
            message: `Document deleted successfully.`,
            data: findAndUpdateLeadDocument
        };
    } catch (error) {
        logger.error(LOG_ID, `Error occurred during fetching deleting lead document (uploadLeadDocument): ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};

/**
 * Get lead dashboard count.
 *
 * @param {string} orgId - Id of logedin user organisation.
 * @returns {object} - An object with the results, including the lead dashboard count.
 */
exports.getLeadDashBoardCount = async (orgId) => {
    try {
        let obj = {
            'LEAD': 0,
            'PROSPECT': 0,
            'ENQUIRY': 0,
            'SALESORDER': 0
        };
        const find = await query.aggregation(leadModel, leadDao.getLeadDashBoardCount(orgId));
        if (!find.length) {
            return {
                success: true,
                message: 'Lead dashboard count.',
                data: {
                    'LEAD': 0,
                    'PROSPECT': 0,
                    'ENQUIRY': 0,
                    'SALESORDER': 0
                }
            };
        }
        for (let ele of find) obj[CRMlevelValueByKey[ele._id]] = ele.count;

        if (find.length) {
            return {
                success: true,
                message: 'Lead dashboard count.',
                data: obj
            };
        }
    } catch (error) {
        logger.error(LOG_ID, `Error occurred during fetching lead dashbord count: ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};

/**
 * Get lead pipeline data.
 *
 * @param {string} orgId - Id of logedin user organisation.
 * @returns {object} - An object with the results, including the lead pipeline data.
 */
exports.getPipelineData = async (orgId) => {
    try {
        const find = await query.aggregation(leadModel, leadDao.getPipelineData(orgId));
        // console.log('find', find);
        if (find.length > 0) {
            return {
                success: true,
                message: 'Lead pipeline data.',
                data: find
            };
        } else {
            return {
                success: true,
                message: 'Lead pipeline not found.',
                data: []
            };
        }
    } catch (error) {
        logger.error(LOG_ID, `Error occurred during fetching lead pipeline data: ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};

/**
 * Get lead pipeline data.
 *
 * @param {string} leadId - Id of lead (req.params).
 * @param {string} orgId - Id of logedin user organisation (req.headrs).
 * @param {string} pipelineName - name of changing pipeline stage (req.body).
 * @param {object} auth - req auth.
 * @returns {object} - An object with the results, including the lead pipeline data.
 */
exports.changePipelineStage = async (leadId, orgId, pipelineName, auth) => {
    try {
        const { _id, email, fname, lname } = auth;
        if (!crmPipelineLevel[pipelineName]) {
            return {
                success: false,
                message: 'Please provide a valid stage name.'
            };
        }
        const findLead = await query.findOne(leadModel, { _id: leadId, organisationId: orgId, isDeleted: false });
        if (!findLead) {
            return {
                success: false,
                message: 'Lead not found.'
            };
        }
        let obj = {
            performedBy: _id,
            performedByEmail: email,
            actionName: `Lead pipeline stage (${pipelineName}) updated by ${fname} ${lname} at ${moment().format('MMMM Do YYYY, h:mm:ss a')}.`
        };
        let updatedData = { 'qualifymeta.pipelineName': pipelineName, 'qualifymeta.pipelinestagenumber': crmPipelineLevel[pipelineName], updatedBy: _id };
        updatedData['$push'] = { Activity: obj };
        const updatedLeadFinance = await leadModel.findByIdAndUpdate(
            leadId,
            updatedData,
            { new: true, runValidators: true }
        );

        if (updatedLeadFinance) {
            return {
                success: true,
                message: 'Lead pipeline stage updated successfully.',
                data: updatedLeadFinance
            };
        }
    } catch (error) {
        logger.error(LOG_ID, `Error occurred during changing Pipeline Stage: ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};

/**
 * Get All Leads Available For Enquiry
 *
 * @param {string} orgId - Id of logedin user organisation (req.headers).
 * @returns {object} - An object with the results, including the lead pipeline data.
 */
exports.getAllLeadForEnquiry = async (orgId) => {
    try {
        if (!orgId) {
            return {
                success: false,
                message: 'Organisation not found.'
            };
        }
        const findData = await query.aggregation(leadModel, leadDao.getAllLeadsAvailableForEnquiry(orgId));
        if (findData.length > 0) {
            return {
                success: true,
                message: 'All availabe lead for enquiry',
                data: findData
            };
        }
        return {
            success: true,
            message: 'No lead availabe for enruiry',
            data: []
        };
    } catch (error) {
        logger.error(LOG_ID, `Error occurred during changing Pipeline Stage: ${error}`);
        return {
            success: false,
            message: 'Something went wrong'
        };
    }
};