const express = require("express");
const router = express.Router();
const Student = require('../models/Student');

const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

// CREATE STUDENT (ADMIN ONLY)
router.post(
  '/',
  authMiddleware,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const newStudent = new Student(req.body);
      await newStudent.save();
      res.status(201).json({ message: 'Student added successfully', student: newStudent });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// GET ALL STUDENTS (ADMIN ONLY)
router.get(
  '/',
  authMiddleware,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const students = await Student.find();
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// GET ONLY STUDENTS OF LOGGED-IN PARENT
router.get(
  '/mine',
  authMiddleware,
  authorizeRoles('parent'),
  async (req, res) => {
    try {
      const students = await Student.find({ parentId: req.user.id });
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// UPDATE STUDENT (ADMIN ONLY)
router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const updated = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!updated) return res.status(404).json({ message: 'Student not found' });
      res.json({ message: 'Student updated successfully', student: updated });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// DELETE STUDENT (ADMIN ONLY)
router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const deleted = await Student.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ message: 'Student not found' });
      res.json({ message: 'Student deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
