const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  fullname: {
    firstname: {
      type: String,
      required: true,
      minlength: [3, "First name must be at least 3 characters long"],
    },
    lastname: {
      type: String,
      minlength: [3, "Last name must be at least 3 characters long"],
    },
  },
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: [5, "Email must be at least 5 characters long"],
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  tokenVersion: { type: Number, default: 0, select: false },
  savedPlaces: [
    {
      label: { type: String, enum: ["Home", "Work"] },
      address: { type: String, maxlength: 300 },
    },
  ],
  socketId: {
    type: String,
  },
  resetOtp: {
    type: String,
    select: false,
  },
  resetOtpExpires: {
    type: Date,
    select: false,
  },
});

userSchema.methods.generateAuthToken = function () {
  const token = jwt.sign(
    { _id: this._id, role: "user", tokenVersion: this.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: "24h" },
  );
  return token;
};

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.statics.hashPassword = async function (password) {
  return await bcrypt.hash(password, 10);
};

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;
