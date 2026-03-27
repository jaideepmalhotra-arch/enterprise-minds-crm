export const EM_SERVICES = [
  'Digital Transformation','Cloud Solutions','AI / ML Implementation',
  'ERP Implementation','Cybersecurity','Data Analytics','Staff Augmentation',
];
export const COMPANY_SIZES = ['1–50','51–200','201–500','501–1000','1000+'];
export const DEAL_STAGES = ['New Lead','Contacted','Discovery Call','Proposal Sent','Negotiation','Won','Lost'];
export const LEAD_SOURCES = ['LinkedIn','Referral','Conference / Event','Apollo.io','Website Inbound','Cold Outreach','Partner','Manual Entry'];
export const INDUSTRIES = [
  'Banking & Finance','Healthcare','Manufacturing','Retail & E-commerce',
  'Logistics & Supply Chain','Education','Government & Public Sector',
  'Energy & Utilities','Telecom','Insurance','Real Estate',
  'Media & Entertainment','Technology','Other',
];
export const FLAGS = {
  'India':'🇮🇳','United States':'🇺🇸','United Kingdom':'🇬🇧','Germany':'🇩🇪',
  'France':'🇫🇷','UAE':'🇦🇪','Saudi Arabia':'🇸🇦','Singapore':'🇸🇬',
  'Australia':'🇦🇺','Canada':'🇨🇦','Netherlands':'🇳🇱','Spain':'🇪🇸',
  'Japan':'🇯🇵','South Korea':'🇰🇷','Brazil':'🇧🇷','South Africa':'🇿🇦',
  'Qatar':'🇶🇦','Kuwait':'🇰🇼','Bahrain':'🇧🇭',
};
export function calcTier(c) {
  const e=!!c.email?.trim(), p=!!(c.phones?.length>0), n=!!c.contact?.trim(), r=!!c.role?.trim(), co=!!c.country?.trim();
  if(e&&p&&n&&r&&co) return 'complete';
  if(e||p) return 'partial';
  if(n) return 'minimal';
  return 'empty';
}
