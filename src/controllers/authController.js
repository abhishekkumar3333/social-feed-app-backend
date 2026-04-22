const User = require('../models/User');
const jwt = require('jsonwebtoken');

const BCRYPT_PATTERN = /^\$2[aby]\$/;

const generateAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });

const generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const buildUserPayload = (user, accessToken, refreshToken) => ({
  _id: user._id,
  username: user.username,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
  role: user.role,
  accessToken,
  refreshToken,
});

const register = async (req, res) => {
  const { username, displayName, email, password } = req.body;

  const existingUser = await User.findOne({ $or: [{ email }, { username }] }).select('+password');

  if (existingUser) {
    if (BCRYPT_PATTERN.test(existingUser.password || '')) {
      return res.status(400).json({ message: 'User already exists' });
    }
    await existingUser.deleteOne();
  }

  try {
    const user = await User.create({ username, displayName, email, password });
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    return res.status(201).json(buildUserPayload(user, accessToken, refreshToken));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'User already exists' });
    }
    throw err;
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  res.json(buildUserPayload(user, accessToken, refreshToken));
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });

    res.json({
      accessToken: generateAccessToken(user._id),
      refreshToken: generateRefreshToken(user._id),
    });
  } catch {
    res.status(403).json({ message: 'Invalid refresh token' });
  }
};

const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = { register, login, refresh, getMe };