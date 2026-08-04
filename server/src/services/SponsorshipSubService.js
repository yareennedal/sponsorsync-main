import sequelize from '../db/index.js';
import SponsorshipInteraction from '../models/SponsorshipInteraction.js';
import SponsorshipFollowup from '../models/SponsorshipFollowup.js';
import SponsorshipAssignment from '../models/SponsorshipAssignment.js';
import SponsorshipFile from '../models/SponsorshipFile.js';

export class SponsorshipSubService {
  static async addInteraction(caseId, data, loggedBy) {
    return await SponsorshipInteraction.create({
      caseId,
      type: data.type,
      summary: data.summary,
      loggedBy,
    });
  }

  static async getInteractions(caseId) {
    return await SponsorshipInteraction.findAll({
      where: { caseId },
      order: [['createdAt', 'DESC']],
    });
  }

  static async addFollowup(caseId, data) {
    return await SponsorshipFollowup.create({
      caseId,
      task: data.task,
      dueDate: data.dueDate,
      assignedTo: data.assignedTo || null,
    });
  }

  static async getFollowups(caseId) {
    return await SponsorshipFollowup.findAll({
      where: { caseId },
      order: [['dueDate', 'ASC']],
    });
  }

  static async toggleFollowup(followupId) {
    const followup = await SponsorshipFollowup.findByPk(followupId);
    if (!followup) throw new Error('Followup task not found');
    followup.completed = !followup.completed;
    await followup.save();
    return followup;
  }

  static async assignUser(caseId, userId, role, assignedBy) {
    return await SponsorshipAssignment.create({
      caseId,
      userId,
      role: role || 'MEMBER',
      assignedBy,
    });
  }

  static async getAssignments(caseId) {
    return await SponsorshipAssignment.findAll({
      where: { caseId },
    });
  }

  static async addFile(caseId, fileData, uploadedBy) {
    return await SponsorshipFile.create({
      caseId,
      fileName: fileData.fileName,
      fileUrl: fileData.fileUrl,
      uploadedBy,
    });
  }

  static async getFiles(caseId) {
    return await SponsorshipFile.findAll({
      where: { caseId },
      order: [['createdAt', 'DESC']],
    });
  }
}

export default SponsorshipSubService;

