import SponsorshipCase from '../models/SponsorshipCase.js';
import SponsorshipInteraction from '../models/SponsorshipInteraction.js';
import SponsorshipFollowup from '../models/SponsorshipFollowup.js';
import SponsorshipAssignment from '../models/SponsorshipAssignment.js';
import SponsorshipFile from '../models/SponsorshipFile.js';

// Setup Relations
SponsorshipCase.hasMany(SponsorshipInteraction, { foreignKey: 'caseId', as: 'interactions' });
SponsorshipInteraction.belongsTo(SponsorshipCase, { foreignKey: 'caseId' });

SponsorshipCase.hasMany(SponsorshipFollowup, { foreignKey: 'caseId', as: 'followups' });
SponsorshipFollowup.belongsTo(SponsorshipCase, { foreignKey: 'caseId' });

SponsorshipCase.hasMany(SponsorshipAssignment, { foreignKey: 'caseId', as: 'assignments' });
SponsorshipAssignment.belongsTo(SponsorshipCase, { foreignKey: 'caseId' });

SponsorshipCase.hasMany(SponsorshipFile, { foreignKey: 'caseId', as: 'files' });
SponsorshipFile.belongsTo(SponsorshipCase, { foreignKey: 'caseId' });
