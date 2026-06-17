const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'An account with this email already exists'
    });
  }

  const user = await User.create({ name, email, password });
  const token = user.generateToken();

  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      preferences: user.preferences,
      createdAt: user.createdAt
    },
    token
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  const token = user.generateToken();

  res.json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      preferences: user.preferences,
      createdAt: user.createdAt
    },
    token
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 */
const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, avatar, timezone, preferences } = req.body;
  const updateData = {};

  if (name) updateData.name = name;
  if (avatar !== undefined) updateData.avatar = avatar;
  if (timezone) updateData.timezone = timezone;
  if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };

  const user = await User.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
    runValidators: true
  });

  res.json({
    success: true,
    data: user
  });
});

/**
 * @route   PUT /api/auth/password
 * @desc    Change password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide current and new password'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters'
    });
  }

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  user.password = newPassword;
  await user.save();

  const token = user.generateToken();

  res.json({
    success: true,
    message: 'Password changed successfully',
    token
  });
});

module.exports = { register, login, getMe, updateProfile, changePassword };
