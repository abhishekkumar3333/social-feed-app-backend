const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const register = async (req, res) => {
  const { username, displayName, email, password } = req.body;

  const existingUser = await User.findOne({ $or: [{ email }, { username }] }).select('+password');

  if (existingUser) {
    // If the password is NOT a valid bcrypt hash it means the document was
    // created in a broken state (e.g. plain-text seed, failed migration).
    // Clean it up and let the registration proceed so the user isn't locked out.
    const isBcryptHash = /^\$2[aby]\$/.test(existingUser.password || '');
    if (!isBcryptHash) {
      await existingUser.deleteOne();
    } else {
      return res.status(400).json({ message: 'User already exists' });
    }
  }

  try {
    const user = await User.create({ username, displayName, email, password });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return res.status(201).json({
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      accessToken,
      refreshToken
    });
  } catch (err) {
    // Handle race-condition duplicate key (E11000)
    if (err.code === 11000) {
      return res.status(400).json({ message: 'User already exists' });
    }
    throw err;
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (user && (await user.matchPassword(password))) {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      accessToken,
      refreshToken
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: 'User not found' });

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(403).json({ message: 'Invalid refresh token' });
  }
};

const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = { register, login, refresh, getMe };