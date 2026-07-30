const rentAgreementSchema = {
  serviceId: "RENTAL_AGREEMENT_11M",
  creditCost: 1,
  fields: [
    // Landlord Info
    { id: "landlordName", label: "Landlord (Owner) Full Name", type: "text" },
    { id: "landlordFather", label: "Landlord's Father Name", type: "text" },
    { id: "landlordAddress", label: "Landlord Permanent Address", type: "textarea" },
    
    // Tenant Info
    { id: "tenantName", label: "Tenant Full Name", type: "text" },
    { id: "tenantFather", label: "Tenant's Father Name", type: "text" },
    { id: "tenantAadhaar", label: "Tenant Aadhaar Number", type: "text" },

    // Property & Rent Terms
    { id: "propertyAddress", label: "Rented Property Address", type: "textarea" },
    { id: "monthlyRent", label: "Monthly Rent (₹)", type: "number" },
    { id: "depositAmount", label: "Security Deposit (₹)", type: "number" },
    { id: "startDate", label: "Agreement Start Date", type: "date" },
    { id: "noticePeriodDays", label: "Notice Period (Days)", type: "number", default: 30 }
  ]
};
