const jwt = require("jsonwebtoken");
const models = {
  user: require("../models/user.model"),
  captain: require("../models/captain.model"),
};
const blacklist = require("../models/blackListToken.model");
const { httpError, asyncHandler } = require("../utils/errors");
async function authenticate(token, expectedRole) {
  if (typeof token !== "string" || token.length > 4096)
    throw httpError(401, "Please log in.");
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "ridex",
      audience: "ridex-app",
    });
  } catch {
    throw httpError(401, "Your session expired. Please log in again.");
  }
  if (
    !Object.hasOwn(models, decoded.role) ||
    (expectedRole && decoded.role !== expectedRole)
  )
    throw httpError(401, "Please log in with the correct account.");
  if (await blacklist.exists({ token }))
    throw httpError(401, "Please log in again.");
  const account = await models[decoded.role]
    .findById(decoded._id)
    .select("+tokenVersion");
  if (!account || (decoded.tokenVersion || 0) !== (account.tokenVersion || 0))
    throw httpError(401, "Please log in again.");
  return { account, role: decoded.role };
}
const guard = (role) =>
  asyncHandler(async (req, res, next) => {
    req.token = req.headers.authorization?.split(" ")[1];
    const auth = await authenticate(req.token, role);
    req.role = auth.role;
    req.account = auth.account;
    req[auth.role] = auth.account;
    require("../utils/logger").debug("auth.verified", { role: auth.role, accountId: auth.account._id });
    next();
  });
module.exports = {
  authenticate,
  authUser: guard("user"),
  authCaptain: guard("captain"),
  authAny: guard(),
};
