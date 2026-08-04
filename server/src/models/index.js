import './User.js';
import './AuditLog.js';
import './Event.js';
import './EventMember.js';
import './SponsorshipPackage.js';
import './Company.js';
import './CompanyContact.js';
import { User } from './User.js';
import { AuditLog } from './AuditLog.js';
import { Event } from './Event.js';
import { EventMember } from './EventMember.js';
import { SponsorshipPackage } from './SponsorshipPackage.js';
import { Company } from './Company.js';
import { CompanyContact } from './CompanyContact.js';

// Associations
AuditLog.belongsTo(User, { foreignKey: 'actor_user_id', as: 'actor' });
User.hasMany(AuditLog, { foreignKey: 'actor_user_id', as: 'auditLogs' });

User.belongsTo(User, { foreignKey: 'created_by', as: 'createdByUser' });
User.hasMany(User, { foreignKey: 'created_by', as: 'createdUsers' });

// Plan 2 associations
User.hasMany(Event, { foreignKey: 'leader_id', as: 'ledEvents' });
Event.belongsTo(User, { foreignKey: 'leader_id', as: 'leader' });

User.hasMany(Event, { foreignKey: 'created_by', as: 'createdEvents' });
Event.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Event.hasMany(EventMember, { foreignKey: 'event_id', as: 'memberships' });
EventMember.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

User.hasMany(EventMember, { foreignKey: 'user_id', as: 'eventMemberships' });
EventMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(EventMember, { foreignKey: 'added_by', as: 'addedEventMembers' });
EventMember.belongsTo(User, { foreignKey: 'added_by', as: 'addedByUser' });

Event.hasMany(SponsorshipPackage, { foreignKey: 'event_id', as: 'sponsorshipPackages' });
SponsorshipPackage.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

User.hasMany(SponsorshipPackage, { foreignKey: 'created_by', as: 'createdSponsorshipPackages' });
SponsorshipPackage.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

User.hasMany(Company, { foreignKey: 'created_by', as: 'createdCompanies' });
Company.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Company.hasMany(CompanyContact, { foreignKey: 'company_id', as: 'contacts' });
CompanyContact.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

User.hasMany(CompanyContact, { foreignKey: 'created_by', as: 'createdCompanyContacts' });
CompanyContact.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

export { User, AuditLog, Event, EventMember, SponsorshipPackage, Company, CompanyContact };
