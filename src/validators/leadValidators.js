const { Joi } = require('express-validation');

exports.createLead = {
    body: Joi.object({
        companyName: Joi.string().required(),
        salesPerson: Joi.string().required(),
        website: Joi.string().required(),
        email: Joi.string().required(),
        phone: Joi.string().required(),
        address: Joi.string().required(),
        note: Joi.string().required(),
        currency: Joi.string().required(),
        dueDate: Joi.string().required(),
        isActive: Joi.boolean().required()
    })
};

exports.getAllLead = {
    query: Joi.object({
        isActive: Joi.string().optional(),
        isQualified: Joi.string().optional(),
        dueDate: Joi.string().optional(),
        organisationId: Joi.string().optional(),
        isRole: Joi.string().optional(),
        page: Joi.string().optional(),
        perPage: Joi.string().optional(),
        sortBy: Joi.string().optional(),
        sortOrder: Joi.string().optional()
    })
};

exports.updateLeadById = {
    body: Joi.object({
        companyName: Joi.string().optional(),
        website: Joi.string().optional(),
        email: Joi.string().optional(),
        phone: Joi.string().optional(),
        address: Joi.string().optional(),
        note: Joi.string().optional(),
        dueDate: Joi.string().optional(),
        isActive: Joi.boolean().optional()
    })
};

exports.qualifyLeadById = {
    body: Joi.object({
        orderValue: Joi.number().required(),
        actualOrderValue: Joi.number().required(),
        interest: Joi.number().required(),
        margin: Joi.number().required(),
        close: Joi.number().required(),
        startdate: Joi.string().required(),
        expectedclosingdate: Joi.string().required(),
        duedate: Joi.string().required(),
        nextaction: Joi.number().required(),
        productdescription: Joi.string().required(),
        pipelineName: Joi.string().required(),
        pipelinestagenumber: Joi.number().required()
    })
};