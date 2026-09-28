const userModel = require("../models/user.model");

module.exports.createUser = async ({
  firstname,
  lastname,
  email,
  password,
}) => {
  if (!firstname || !email || !password) {
    throw new Error("All fields are required");
  }
  const user = userModel.create({
    fullname: {
      firstname,
      lastname: lastname || undefined,
    },
    email,
    password,
  });

  return user;
};

module.exports = require("../utils/instrument")(module.exports, "user");
