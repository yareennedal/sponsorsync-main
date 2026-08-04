import sequelize from '../db/index.js';
import SponsorshipCase from '../models/SponsorshipCase.js';

const STATUS_RANKS = {
  DRAFT: 1,
  PROPOSED: 2,
  NEGOTIATING: 3,
  APPROVED: 4,
  REJECTED: 4,
  CONTRACT_SIGNED: 5,
  CANCELLED: 5,
};

export class SponsorshipCaseService {
  static async createCase(data, createdBy) {
    const statusRank = STATUS_RANKS[data.status] || 1;
    return await SponsorshipCase.create({
      eventId: data.eventId,
      companyId: data.companyId,
      title: data.title,
      notes: data.notes,
      status: data.status || 'DRAFT',
      statusRank,
      createdBy,
    });
  }

  static async getCases(filters = {}) {
    const where = {};
    if (filters.eventId) where.eventId = filters.eventId;
    if (filters.companyId) where.companyId = filters.companyId;
    if (filters.status) where.status = filters.status;

    return await SponsorshipCase.findAll({
      where,
      order: [['updatedAt', 'DESC']],
    });
  }

  static async getCaseById(id) {
    const sponsorshipCase = await SponsorshipCase.findByPk(id);
    if (!sponsorshipCase) {
      throw new Error('Sponsorship case not found');
    }
    return sponsorshipCase;
  }

  static async updateStatus(id, newStatus) {
    const sponsorshipCase = await this.getCaseById(id);
    const newRank = STATUS_RANKS[newStatus];

    if (!newRank) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    sponsorshipCase.status = newStatus;
    sponsorshipCase.statusRank = newRank;
    await sponsorshipCase.save();

    return sponsorshipCase;
  }

  static async updateCase(id, updateData) {
    const sponsorshipCase = await this.getCaseById(id);
    
    if (updateData.status) {
      updateData.statusRank = STATUS_RANKS[updateData.status] || sponsorshipCase.statusRank;
    }

    await sponsorshipCase.update(updateData);
    return sponsorshipCase;
  }

  static async deleteCase(id) {
    const sponsorshipCase = await this.getCaseById(id);
    await sponsorshipCase.destroy();
    return true;
  }
}

export default SponsorshipCaseService;
