import SponsorshipCase from './SponsorshipCase.js';
import SponsorshipAssignment from './SponsorshipAssignment.js';
import SponsorshipInteraction from './SponsorshipInteraction.js';
import SponsorshipFollowup from './SponsorshipFollowup.js';
import SponsorshipFile from './SponsorshipFile.js';

// استيراد الـ Models الخاصة بالفريق للربط معها
import Event from './Event.js';
import Company from './Company.js';
import User from './User.js';

export function setupSponsorshipAssociations() {
  // SponsorshipCase Relationships
  SponsorshipCase.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });
  SponsorshipCase.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
  SponsorshipCase.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

  SponsorshipCase.hasMany(SponsorshipAssignment, { foreignKey: 'caseId', as: 'assignments' });
  SponsorshipCase.hasMany(SponsorshipInteraction, { foreignKey: 'caseId', as: 'interactions' });
  SponsorshipCase.hasMany(SponsorshipFollowup, { foreignKey: 'caseId', as: 'followups' });
  SponsorshipCase.hasMany(SponsorshipFile, { foreignKey: 'caseId', as: 'files' });

  // Assignments Relationships
  SponsorshipAssignment.belongsTo(SponsorshipCase, { foreignKey: 'caseId', as: 'case' });
  SponsorshipAssignment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Interactions Relationships
  SponsorshipInteraction.belongsTo(SponsorshipCase, { foreignKey: 'caseId', as: 'case' });
  SponsorshipInteraction.belongsTo(User, { foreignKey: 'userId', as: 'author' });

  // Followups Relationships
  SponsorshipFollowup.belongsTo(SponsorshipCase, { foreignKey: 'caseId', as: 'case' });
  SponsorshipFollowup.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

  // Files Relationships
  SponsorshipFile.belongsTo(SponsorshipCase, { foreignKey: 'caseId', as: 'case' });
  SponsorshipFile.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });
}
