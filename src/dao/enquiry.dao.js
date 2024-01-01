const mongoose = require('mongoose');
// const moment = require('moment');

/**
 * Options for customizing the lead retrieval.
 *
 * @typedef {object} GetAllLeadOptions
 * @property {boolean} isActive - Filter leads based on their activation status.
 * @property {number} page - The current page for pagination.
 * @property {number} perPage - The number of leads to display per page.
 * @property {string} sortBy - Field to sort by.
 * @property {string} sortOrder - Sort order.
 * @property {string} search - complete search on all fields.
 * @property {string} salesPerson - search on sales person.
 * @property {number} level - The level of the lead.
 */

/**
 * Generates an aggregation pipeline to retrieve a paginated and sorted list of enquiry.
 *
 * @param {string} orgId - The organization's unique identifier.
 * @param {GetAllLeadOptions} options - Options to customize the lead retrieval.
 * @returns {Array} - An aggregation pipeline to retrieve a paginated and sorted list of enquiry.
 */
exports.getAllEnquiryPipeline = (orgId, { isActive, page, perPage, sortBy, sortOrder, level, leadId, enquiryId, search, salesPerson }) => {
    let pipeline = [
        {
            $match: {
                organisationId: new mongoose.Types.ObjectId(orgId),
                isDeleted: false
            }
        },
        {
            $sort: {
                // 'updatedAt': -1
            }
        },
        {
            $skip: (page - 1) * perPage
        },
        {
            $limit: perPage
        },
        {
            $lookup: {
                from: 'users',
                localField: 'salesPerson',
                foreignField: '_id',
                as: 'userDetails'
            }
        },
        {
            $addFields: {
                userDetails: {
                    $arrayElemAt: ['$userDetails', 0]
                }
            }
        },
        {
            $addFields: {
                salesPersonName: {
                    $concat: [
                        '$userDetails.fname',
                        ' ',
                        '$userDetails.lname'
                    ]
                }
            }
        },
        {
            $project: {
                result: 0,
                userDetails: 0,
                email: 0,
                phone: 0,
                leadId: 0,
                leadContactId: 0,
                createdBy: 0,
                updatedBy: 0,
                createdAt: 0
                // Activity: 0

            }
        },
        {
            $lookup: {
                from: 'enquiryitems',
                let: {
                    enquiryId: '$_id'
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$enquiryId', '$$enquiryId'] },
                                    { $eq: ['$isDeleted', false] }
                                ]
                            }
                        }
                    }
                ],
                as: 'enquiryItems'
            }
        }
    ];

    if (isActive) {
        pipeline[0]['$match']['isActive'] = isActive === 'true' ? true : false;
    }

    if (enquiryId) {
        pipeline[0]['$match']['_id'] = new mongoose.Types.ObjectId(enquiryId);
    }
    if (leadId) {
        pipeline[0]['$match']['leadId'] = new mongoose.Types.ObjectId(leadId);
    }
    if (salesPerson) {
        pipeline[0]['$match']['salesPerson'] = new mongoose.Types.ObjectId(salesPerson);
    }

    if (level) {
        pipeline[0]['$match']['level'] = +level;
    }

    if (search) {
        pipeline[0]['$match']['$or'] = [
            { Id: { $regex: `${search}.*`, $options: 'i' } },
            { companyName: { $regex: `${search}.*`, $options: 'i' } }
            // { contact_person: { $regex: `${search}.*`, $options: 'i' } },
            // { quoteDueDate: { $regex: `${search}.*`, $options: 'i' } },
            // { final_quote: { $regex: `${search}.*`, $options: 'i' } }
        ];
    }

    if (sortBy && sortOrder) {
        pipeline[1]['$sort'][sortBy] = sortOrder === 'desc' ? -1 : 1;
    } else {
        pipeline[1]['$sort']['updatedAt'] = -1;
    }

    return pipeline;
};

/**
 * Generates an aggregation pipeline to retrieve enquiry by id.
 *
 * @param {string} orgId - The organization's unique identifier.
 * @param {string} enquiryId - The enquiry's unique identifier.
 * @returns {Array} - An aggregation pipeline to retrieve a enquiry by id.
 */
exports.getEnquiryByIdPipeline = (orgId, enquiryId) => [
    {
        $match: {
            organisationId: new mongoose.Types.ObjectId(orgId),
            _id: new mongoose.Types.ObjectId(enquiryId),
            isDeleted: false
        }
    },
    {
        $lookup: {
            from: 'currencies',
            let: {
                currencyId: '$currency'
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $eq: ['$_id', '$$currencyId']
                        }
                    }
                },
                {
                    $project: {
                        createdAt: 0,
                        updatedAt: 0
                    }
                }
            ],
            as: 'result'
        }
    },
    {
        $lookup: {
            from: 'users',
            localField: 'salesPerson',
            foreignField: '_id',
            as: 'userDetails'
        }
    },
    {
        $addFields: {
            result: {
                $arrayElemAt: ['$result', 0]
            },
            userDetails: {
                $arrayElemAt: ['$userDetails', 0]
            }
        }
    },
    {
        $addFields: {
            currencyText: {
                $concat: [
                    '$result.currencyShortForm',
                    ' (',
                    '$result.currencySymbol',
                    ')'
                ]
            },
            salesPersonName: {
                $concat: [
                    '$userDetails.fname',
                    ' ',
                    '$userDetails.lname'
                ]
            }
        }
    },
    {
        $project: {
            result: 0,
            userDetails: 0,
            Activity: 0
        }
    },
    {
        $lookup: {
            from: 'enquiryitems',
            let: {
                enquiryId: '$_id'
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                {
                                    $eq: [
                                        '$enquiryId',
                                        '$$enquiryId'
                                    ]
                                },
                                {
                                    $eq: ['$isDeleted', false]
                                }
                            ]
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'supplieritems',
                        let: {
                            code: '$partNumberCode'
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: [
                                            '$partNumberCode',
                                            '$$code'
                                        ]
                                    }
                                }
                            },
                            {
                                $lookup: {
                                    from: 'suppliers',
                                    let: {
                                        supplierId: '$supplierId'
                                    },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $and: [
                                                        {
                                                            $eq: ['$_id', '$$supplierId']
                                                        },
                                                        {
                                                            $eq: ['$level', 3]
                                                        },
                                                        {
                                                            $eq: ['$isActive', true]
                                                        },
                                                        {
                                                            $eq: ['$isApproved', true]
                                                        }
                                                    ]
                                                }
                                            }
                                        },
                                        {
                                            $project: {
                                                companyName: 1
                                            }
                                        }
                                    ],
                                    as: 'companyName'
                                }
                            },
                            {
                                $unwind: {
                                    path: '$companyName'
                                }
                            },
                            {
                                $addFields: {
                                    companyName: '$companyName.companyName'
                                }
                            },
                            {
                                $project: {
                                    companyName: 1,
                                    supplierId: 1,
                                    supplierItemId: '$_id',
                                    _id: 0,
                                    hscode: 1,
                                    partDesc: 1,
                                    partNumber: 1,
                                    partNumberCode: 1,
                                    delivery: 1,
                                    notes: 1,
                                    unitPrice: 1
                                }
                            }
                        ],

                        as: 'supplierItems'
                    }
                }
            ],
            as: 'enquiryItems'
        }
    }
];

/**
 * Generates an aggregation pipeline to retrieve Recommended Supplier With Items.
 *
 * @param {string} enquiryId - The enquiry's unique identifier.
 * @returns {Array} - An aggregation pipeline to retrieve a Recommended Supplier With Items.
 */
exports.getRecommendedSupplierWithItems = (enquiryId) => [
    {
        $match: {
            enquiryId: new mongoose.Types.ObjectId(enquiryId)
        }
    },
    {
        $lookup: {
            from: 'supplieritems',
            let: {
                code: '$partNumberCode'
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                {
                                    $eq: [
                                        '$partNumberCode',
                                        '$$code'
                                    ]
                                },
                                {
                                    $eq: ['$isDeleted', false]
                                }
                            ]
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'suppliers',
                        let: {
                            supplierId: '$supplierId'
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: [
                                                    '$_id',
                                                    '$$supplierId'
                                                ]
                                            },
                                            {
                                                $eq: ['$level', 3]
                                            },
                                            {
                                                $eq: ['$isActive', true]
                                            },
                                            {
                                                $eq: [
                                                    '$isApproved',
                                                    true
                                                ]
                                            }
                                        ]
                                    }
                                }
                            },
                            {
                                $project: {
                                    supplierId: '$_id',
                                    companyName: 1,
                                    _id: 0,
                                    industryType: 1,
                                    currency: 1
                                }
                            }
                        ],
                        as: 'supplier'
                    }
                },
                {
                    $unwind: {
                        path: '$supplier'
                    }
                },
                {
                    $lookup: {
                        from: 'suppliercontacts',
                        let: {
                            suppierId: '$supplierId'
                        },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: [
                                                    '$supplierId',
                                                    '$$suppierId'
                                                ]
                                            },
                                            {
                                                $eq: [
                                                    '$isDeleted',
                                                    false
                                                ]
                                            }
                                        ]
                                    }
                                }
                            }
                        ],
                        as: 'supplierContacts'
                    }
                }
            ],
            as: 'result'
        }
    },
    {
        $unwind: {
            path: '$result'
        }
    },
    {
        $project: {
            enquiryItemId: '$_id',
            enquiryId: 1,
            quantity: 1,
            supplierItemId: '$result._id',
            supplierId: '$result.supplierId',
            sCompanyName:
                '$result.supplier.companyName',
            sIndustryType:
                '$result.supplier.industryType',
            sCurrency: '$result.supplier.currency',
            sipartNumber: '$result.partNumber',
            sipartNumberCode: '$result.partNumberCode',
            sipartDesc: '$result.partDesc',
            sidelivery: '$result.delivery',
            sinotes: '$result.notes',
            siunitPrice: '$result.unitPrice',
            supplierContacts:
                '$result.supplierContacts',
            _id: 0
        }
    },
    {
        $lookup: {
            from: 'enquirysupplierselecteditems',
            let: {
                enquiryId: '$enquiryId',
                enquiryItemId: '$enquiryItemId',
                supplierId: '$supplierId',
                supplierItemId: '$supplierItemId'
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $and: [
                                {
                                    $eq: [
                                        '$enquiryId',
                                        '$$enquiryId'
                                    ]
                                },
                                {
                                    $eq: [
                                        '$enquiryItemId',
                                        '$$enquiryItemId'
                                    ]
                                },
                                {
                                    $eq: [
                                        '$supplierId',
                                        '$$supplierId'
                                    ]
                                },
                                {
                                    $eq: [
                                        '$supplierItemId',
                                        '$$supplierItemId'
                                    ]
                                }
                            ]
                        }
                    }
                }
            ],
            as: 'enquirysupplierselecteditems'
        }
    },
    {
        $unwind: {
            path: '$enquirysupplierselecteditems',
            preserveNullAndEmptyArrays: true
        }
    },
    {
        $addFields: {
            isSelected: {
                $cond: {
                    if: {
                        $gt: [
                            {
                                $ifNull: [
                                    '$enquirysupplierselecteditems',
                                    null
                                ]
                            },
                            null
                        ]
                    },
                    then: true,
                    else: false
                }
            },
            selectedItemQuantity: {
                $cond: {
                    if: {
                        $and: [
                            {
                                $gt: [
                                    {
                                        $ifNull: [
                                            '$enquirysupplierselecteditems',
                                            null
                                        ]
                                    },
                                    null
                                ]
                            },
                            {
                                $gt: [
                                    {
                                        $ifNull: [
                                            '$enquirysupplierselecteditems.quantity',
                                            null
                                        ]
                                    },
                                    null
                                ]
                            }
                        ]
                    },
                    then: '$enquirysupplierselecteditems.quantity',
                    else: null
                }
            },
            enquirysupplierselecteditemsId: {
                $cond: {
                    if: {
                        $and: [
                            {
                                $gt: [
                                    {
                                        $ifNull: [
                                            '$enquirysupplierselecteditems',
                                            null
                                        ]
                                    },
                                    null
                                ]
                            },
                            {
                                $gt: [
                                    {
                                        $ifNull: [
                                            '$enquirysupplierselecteditems._id',
                                            null
                                        ]
                                    },
                                    null
                                ]
                            }
                        ]
                    },
                    then: '$enquirysupplierselecteditems._id',
                    else: null
                }
            }
        }
    },
    {
        $group: {
            _id: '$supplierId',
            items: {
                $push: '$$ROOT'
            },
            currency: {
                $first: '$sCurrency'
            },
            supplierContacts: {
                $first: '$supplierContacts'
            },
            companyName: {
                $first: '$sCompanyName'
            },
            industryType: {
                $first: '$sIndustryType'
            },
            enquiryId: {
                $first: '$enquiryId'
            }
        }
    },
    {
        $project: {
            'items.supplierContacts': 0,
            'items.sCurrency': 0,
            'items.sCompanyName': 0,
            'items.sIndustryType': 0,
            'items.enquiryId': 0,
            'items.supplierId': 0,
            'items.enquirysupplierselecteditems': 0
        }
    },
    {
        $lookup: {
            from: 'currencies',
            localField: 'currency',
            foreignField: '_id',
            as: 'currencyName'
        }
    },
    {
        $unwind: {
            path: '$currencyName',
            preserveNullAndEmptyArrays: true
        }
    },
    {
        $addFields: {
            currencyName: {
                $concat: [
                    '$currencyName.currencyShortForm',
                    '(',
                    '$currencyName.currencySymbol',
                    ')'
                ]
            }
        }
    }
];