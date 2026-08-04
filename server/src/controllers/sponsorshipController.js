import SponsorshipCaseService from '../services/SponsorshipCaseService.js';
import SponsorshipSubService from '../services/SponsorshipSubService.js';

export const createCase = async (req, res) => {
  try {
    const result = await SponsorshipCaseService.createCase(req.body, req.user.id);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const result = await SponsorshipCaseService.updateStatus(id, status, req.user.id, notes);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getCaseById = async (req, res) => {
  try {
    const data = await SponsorshipCaseService.getCaseById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Case not found' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllCases = async (req, res) => {
  try {
    const data = await SponsorshipCaseService.getAllCases(req.query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addInteraction = async (req, res) => {
  try {
    const data = await SponsorshipSubService.addInteraction(req.params.id, req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const addFollowup = async (req, res) => {
  try {
    const data = await SponsorshipSubService.addFollowup(req.params.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
